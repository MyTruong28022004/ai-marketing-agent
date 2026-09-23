import { chromium } from 'playwright-core'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const executablePath = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const baseUrl = process.env.WEB_URL || 'http://localhost:5173'
const screenshotPath = join(tmpdir(), 'milo-token-dashboard-smoke.png')
const errorScreenshotPath = join(tmpdir(), 'milo-rbac-billing-smoke-error.png')
const browser = await chromium.launch({ executablePath, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const failures = []

page.on('pageerror', error => failures.push(`pageerror: ${error.message}`))
page.on('console', message => { if (message.type() === 'error') failures.push(`console: ${message.text()}`) })
page.on('requestfailed', request => failures.push(`request: ${request.method()} ${request.url()} ${request.failure()?.errorText}`))

async function login(email) {
  await page.context().clearCookies()
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill('MiloDemo123!')
  await page.locator('form button[type="submit"]').click()
  await page.locator('.app-shell').waitFor({ timeout: 20_000 })
  failures.length = 0
}

try {
  await login('admin@milo.local')

  await page.goto(`${baseUrl}/billing`, { waitUntil: 'networkidle' })
  await page.locator('.billing-page h1').waitFor({ timeout: 20_000 })
  if (await page.locator('.plan-option').count() !== 3) throw new Error('Pricing catalog must render three plans')
  if (await page.locator('.addon-grid article').count() !== 3) throw new Error('Token catalog must render three add-ons')
  await page.screenshot({ path: screenshotPath, fullPage: true })

  await page.goto(`${baseUrl}/team`, { waitUntil: 'networkidle' })
  await page.locator('.permission-table').waitFor({ timeout: 20_000 })
  if (await page.locator('.permission-table > div').count() !== 6) throw new Error('Permission matrix is incomplete')

  await page.goto(`${baseUrl}/leads`, { waitUntil: 'networkidle' })
  await page.locator('.sales-page h1').waitFor({ timeout: 20_000 })
  await page.locator('.sales-page .primary-btn').click()
  await page.locator('.lead-form').waitFor()
  await page.locator('.lead-form .modal-x').click()

  await login('marketer@milo.local')
  const marketerNav = await page.locator('.sidebar nav').innerText()
  if (!marketerNav.includes('Video Studio') || marketerNav.includes('Lead & Pipeline') || marketerNav.includes('Quản lý token')) {
    throw new Error(`Unexpected Marketer navigation: ${marketerNav}`)
  }
  await page.goto(`${baseUrl}/leads`, { waitUntil: 'networkidle' })
  await page.waitForURL(`${baseUrl}/`)

  await login('sales@milo.local')
  const salesNav = await page.locator('.sidebar nav').innerText()
  if (!salesNav.includes('Lead & Pipeline') || salesNav.includes('Video Studio') || salesNav.includes('Quản lý token')) {
    throw new Error(`Unexpected Sales navigation: ${salesNav}`)
  }
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
  await page.locator('.sales-page').waitFor()

  if (failures.length) throw new Error(failures.join('\n'))
  console.log(JSON.stringify({ ok: true, screenshot: screenshotPath, routes: ['/billing', '/team', '/leads'], roles: ['ADMIN', 'MARKETER', 'SALES'] }))
} catch (error) {
  await page.screenshot({ path: errorScreenshotPath, fullPage: true }).catch(() => undefined)
  console.error(JSON.stringify({ url: page.url(), body: (await page.locator('body').innerText().catch(() => '')).slice(0, 1600), failures, errorScreenshotPath }))
  console.error(error)
  process.exitCode = 1
} finally {
  await browser.close()
}
