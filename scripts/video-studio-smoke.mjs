import { chromium } from 'playwright-core'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const executablePath = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const baseUrl = process.env.WEB_URL || 'http://localhost:5173'
const opencutUrl = process.env.OPENCUT_URL || 'http://localhost:3000'
const desktopPath = join(tmpdir(), 'milo-video-studio-smoke.png')
const workflowPath = join(tmpdir(), 'milo-video-studio-workflow-smoke.png')
const editorPath = join(tmpdir(), 'milo-video-studio-editor-smoke.png')
const mobilePath = join(tmpdir(), 'milo-video-studio-smoke-mobile.png')
const errorPath = join(tmpdir(), 'milo-video-studio-smoke-error.png')
const browser = await chromium.launch({ executablePath, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const failures = []

page.on('pageerror', error => failures.push(`pageerror: ${error.message}`))
page.on('console', message => {
  const sourceUrl = message.location().url || ''
  if (message.type() === 'error' && !sourceUrl.startsWith(opencutUrl) && !message.text().includes(opencutUrl)) failures.push(`console: ${message.text()}`)
})
page.on('requestfailed', request => {
  if (!request.url().startsWith(opencutUrl) && !request.url().includes('/renders/') && !request.url().includes('/scenes/')) failures.push(`request: ${request.url()} ${request.failure()?.errorText}`)
})

try {
  await page.goto(`${baseUrl}/video-studio`, { waitUntil: 'networkidle' })
  if (await page.locator('input[name="email"]').isVisible().catch(() => false)) {
    await page.locator('input[name="email"]').fill('admin@milo.local')
    await page.locator('input[name="password"]').fill('MiloDemo123!')
    await page.locator('form button[type="submit"]').click()
  }
  await page.getByRole('heading', { name: /Thư viện video/i }).waitFor({ timeout: 20_000 })
  failures.length = 0
  await page.locator('.library-video-card').first().waitFor({ timeout: 20_000 })
  if (await page.locator('[data-video-editor]').count()) throw new Error('Video editor module is still mounted')
  await page.screenshot({ path: desktopPath, fullPage: true })

  await page.getByRole('button', { name: /Tạo video mới/i }).click()
  await page.getByRole('heading', { name: /Ý tưởng và nguồn kịch bản/i }).waitFor()
  if (await page.locator('.video-flow-steps > button').count() !== 5) throw new Error('Expected the five-step workflow')
  await page.screenshot({ path: workflowPath, fullPage: true })
  await page.getByRole('button', { name: /Thư viện video/i }).click()
  await page.locator('.library-video-card').first().locator('.library-thumb').click()
  if (!await page.locator('[data-video-editor]').count()) {
    await page.getByRole('button', { name: /Bỏ qua voice và mở editor/i }).click()
  }
  await page.locator('[data-video-editor]').waitFor({ timeout: 20_000 })
  if (process.env.VIDEO_RENDER_SMOKE === '1') {
    await page.getByRole('button', { name: /Render|Xuất video/i }).click()
    await page.locator('.export-modal').waitFor()
    await page.locator('.export-modal').waitFor({ state: 'detached', timeout: 120_000 })
    await page.getByRole('link', { name: /Tải MP4/i }).waitFor({ timeout: 20_000 })
  }
  await page.screenshot({ path: editorPath, fullPage: true })
  await page.getByRole('button', { name: /Thư viện video/i }).click()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: /Thư viện video/i }).waitFor({ timeout: 20_000 })
  if (await page.locator('[data-video-editor]').count()) throw new Error('Video editor module is still mounted on mobile')
  await page.getByRole('button', { name: /Tạo video mới/i }).click()
  await page.getByRole('heading', { name: /Ý tưởng và nguồn kịch bản/i }).waitFor()
  await page.screenshot({ path: mobilePath, fullPage: true })
  if (failures.length) throw new Error(failures.join('\n'))
  console.log(JSON.stringify({ ok: true, route: page.url(), desktopScreenshot: desktopPath, workflowScreenshot: workflowPath, editorScreenshot: editorPath, mobileScreenshot: mobilePath }))
} catch (error) {
  await page.screenshot({ path: errorPath, fullPage: true }).catch(() => undefined)
  console.error(JSON.stringify({ url: page.url(), body: (await page.locator('body').innerText().catch(() => '')).slice(0, 1500), errorScreenshot: errorPath }))
  console.error(error)
  process.exitCode = 1
} finally {
  await browser.close()
}
