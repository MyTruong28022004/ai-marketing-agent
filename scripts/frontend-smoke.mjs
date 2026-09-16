import { chromium } from 'playwright-core'
import { PrismaClient } from '../server/node_modules/@prisma/client/index.js'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const email = process.env.SMOKE_EMAIL || 'frontend.smoke@milo.local'
const executablePath = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const baseUrl = process.env.WEB_URL || 'http://localhost:5173'
const screenshotPath = join(tmpdir(), 'milo-frontend-smoke.png')
const dashboardScreenshotPath = join(tmpdir(), 'milo-dashboard-smoke.png')
const mobileScreenshotPath = join(tmpdir(), 'milo-frontend-smoke-mobile.png')
const errorScreenshotPath = join(tmpdir(), 'milo-frontend-smoke-error.png')
process.env.DATABASE_URL ||= 'postgresql://milo:milo_dev_password@localhost:55433/milo?schema=public'

const prisma = new PrismaClient()

async function cleanupSmokeUser() {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, createdWorkspaces: { select: { id: true } } },
  })
  if (!user) return
  const workspaceIds = user.createdWorkspaces.map(workspace => workspace.id)
  await prisma.$transaction(async transaction => {
    await transaction.auditLog.deleteMany({
      where: { OR: [{ actorId: user.id }, { workspaceId: { in: workspaceIds } }] },
    })
    await transaction.invitation.deleteMany({ where: { email } })
    await transaction.workspace.deleteMany({ where: { id: { in: workspaceIds } } })
    await transaction.user.delete({ where: { id: user.id } })
  })
}

await cleanupSmokeUser()

const browser = await chromium.launch({ executablePath, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click()
  await page.getByLabel('Họ và tên').fill('Frontend Smoke')
  await page.getByLabel('Tên công ty').fill('Frontend Smoke Company With A Very Long Tenant Name')
  await page.getByLabel('Email công việc').fill(email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill('FrontendSmoke123!')
  await page.getByLabel('Xác nhận mật khẩu').fill('FrontendSmoke123!')
  await page.getByRole('button', { name: /Tạo workspace/ }).click()

  await page.getByRole('heading', { name: 'Doanh nghiệp', exact: true }).waitFor()
  await page.getByLabel('Website công ty').fill('https://frontend-smoke.example.com')
  await page.getByRole('button', { name: 'Tự động điền' }).waitFor()
  await page.getByRole('button', { name: /Lưu và tiếp tục/ }).click()

  await page.getByLabel('Lĩnh vực chính').fill('SaaS')
  await page.getByLabel('Mô tả hoạt động').fill('Nền tảng phần mềm hỗ trợ doanh nghiệp tăng trưởng.')
  await page.getByRole('button', { name: /Lưu và tiếp tục/ }).click()

  await page.getByLabel('Nhóm sản phẩm / dịch vụ').fill('Marketing platform, Analytics')
  await page.getByRole('button', { name: /Lưu và tiếp tục/ }).click()

  await page.getByLabel('Khách hàng chính').fill('Doanh nghiệp vừa và nhỏ tại Việt Nam')
  await page.getByRole('button', { name: /Lưu và tiếp tục/ }).click()

  await page.getByRole('button', { name: /Tăng nhận diện thương hiệu/ }).click()
  await page.getByRole('button', { name: /Lưu và tiếp tục/ }).click()

  await page.getByLabel('Giọng điệu thương hiệu').fill('Rõ ràng, chuyên nghiệp, gần gũi')
  await page.getByRole('button', { name: /Lưu và tiếp tục/ }).click()

  await page.getByLabel('Facebook Page').fill('https://facebook.com/frontend.smoke')
  await page.getByRole('button', { name: /Lưu và tiếp tục/ }).click()

  await page.getByLabel('Tên đối thủ *').fill('Competitor Smoke')
  await page.getByLabel('Website', { exact: true }).fill('https://github.com')
  await page.getByRole('button', { name: /Thêm đối thủ/ }).click()
  await page.getByText('Competitor Smoke').waitFor()
  await page.getByRole('button', { name: 'Chỉnh sửa Competitor Smoke' }).click()
  await page.getByLabel('Tên đối thủ đang sửa').fill('Competitor Smoke Edited')
  await page.getByRole('button', { name: /Lưu thay đổi/ }).click()
  await page.getByText('Competitor Smoke Edited').waitFor()
  await page.locator('.competitor-logo-image').waitFor()
  await page.waitForFunction(() => document.querySelector('.competitor-logo-image')?.naturalWidth > 0)

  await page.getByLabel('Tên đối thủ *').fill('Delete Smoke')
  await page.getByLabel('Website', { exact: true }).fill('https://delete-smoke.example.com')
  await page.getByRole('button', { name: /Thêm đối thủ/ }).click()
  await page.getByText('Delete Smoke').waitFor()
  await page.getByRole('button', { name: 'Xóa Delete Smoke' }).click()
  await page.getByText('Delete Smoke').waitFor({ state: 'detached' })
  await page.getByRole('button', { name: /Hoàn tất thiết lập/ }).click()

  await page.getByText('Frontend Smoke Company With A Very Long Tenant Name').first().waitFor()
  const tenantEllipsis = await page.locator('.workspace-switch b').evaluate(element => ({
    clipped: element.scrollWidth > element.clientWidth,
    overflow: getComputedStyle(element).overflow,
    textOverflow: getComputedStyle(element).textOverflow,
  }))
  if (!tenantEllipsis.clipped || tenantEllipsis.overflow !== 'hidden' || tenantEllipsis.textOverflow !== 'ellipsis') {
    throw new Error(`Workspace name ellipsis is not active: ${JSON.stringify(tenantEllipsis)}`)
  }
  await page.locator('.channel-icon.instagram svg').waitFor()
  await page.locator('.channel-icon.facebook svg').waitFor()
  await page.locator('.channel-icon.tiktok svg').waitFor()
  await page.locator('.metric-icon.sky svg').waitFor()
  const revenueIconLayout = await page.locator('.metric-icon.sky').evaluate(element => {
    const icon = element.getBoundingClientRect()
    const card = element.closest('.metric-card').getBoundingClientRect()
    return { inside: icon.left >= card.left && icon.right <= card.right && icon.top >= card.top && icon.bottom <= card.bottom }
  })
  if (!revenueIconLayout.inside) throw new Error('Revenue icon overflows its metric card')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: dashboardScreenshotPath, fullPage: true })
  await page.getByRole('button', { name: /Radar đối thủ/ }).click()
  await page.getByRole('heading', { name: 'Radar đối thủ' }).waitFor()
  await page.getByText('Competitor Smoke Edited').waitFor()
  await page.screenshot({ path: screenshotPath, fullPage: true })
  await page.getByRole('tab', { name: 'Tổng quan' }).click()
  await page.locator('.ai-insight-banner').waitFor()
  await page.getByText('OPPORTUNITY ENGINE', { exact: true }).waitFor()
  await page.getByRole('tab', { name: 'Keyword Trends' }).click()
  await page.locator('.intelligence-empty, .keyword-trends-layout').waitFor()
  await page.getByRole('tab', { name: 'Content Gaps' }).click()
  await page.locator('.intelligence-empty, .content-gap-view').waitFor()
  await page.getByRole('tab', { name: 'Kết nối Social' }).click()
  await page.locator('.social-connect-hero').waitFor()
  await page.locator('.social-platform-card').first().waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Radar đối thủ' }).waitFor()
  await page.getByRole('button', { name: 'Mở menu' }).click()
  await page.getByRole('button', { name: /Radar đối thủ/ }).waitFor()
  await page.screenshot({ path: mobileScreenshotPath, fullPage: true })

  console.log(JSON.stringify({ ok: true, email, route: page.url(), dashboardScreenshot: dashboardScreenshotPath, screenshot: screenshotPath, mobileScreenshot: mobileScreenshotPath }))
} catch (error) {
  await page.screenshot({ path: errorScreenshotPath, fullPage: true })
  console.error(error)
  process.exitCode = 1
} finally {
  await browser.close()
  await cleanupSmokeUser()
  await prisma.$disconnect()
}
