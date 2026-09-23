import { OnboardingStatus, OnboardingStep, PrismaClient, WorkspaceRole } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await argon2.hash('MiloDemo123!')
  const user = await prisma.user.upsert({
    where: { email: 'admin@milo.local' },
    update: {},
    create: {
      email: 'admin@milo.local',
      name: 'Milo Admin',
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  })

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'atelier-no-8' },
    update: {
      name: 'Atelier No.8',
      onboardingStatus: OnboardingStatus.COMPLETED,
      onboardingStep: OnboardingStep.COMPLETE,
      companyProfile: {
        upsert: {
          create: {
            legalName: 'Atelier No.8',
            website: 'https://atelier-no8.example.com',
            country: 'VN',
            language: 'vi',
            timezone: 'Asia/Ho_Chi_Minh',
            industry: 'Fashion',
            subIndustries: ['Linen', 'Accessories'],
            businessModel: 'B2C',
            description: 'Thời trang linen và phụ kiện dành cho khách hàng thành thị.',
            products: { groups: ['Váy linen', 'Áo sơ mi', 'Phụ kiện'] },
            audiences: { primary: 'Nữ 25–40 tuổi tại các thành phố lớn' },
            goals: ['Traffic', 'Leads', 'Revenue'],
            brandVoice: { tone: ['Tinh tế', 'Gần gũi', 'Tự tin'] },
            onboardingData: { facebookPageUrl: 'https://facebook.com/atelier.no8', searchConsoleRequested: true },
          },
          update: {
            legalName: 'Atelier No.8',
            website: 'https://atelier-no8.example.com',
            country: 'VN',
            language: 'vi',
            timezone: 'Asia/Ho_Chi_Minh',
            industry: 'Fashion',
            subIndustries: ['Linen', 'Accessories'],
            businessModel: 'B2C',
            description: 'Thời trang linen và phụ kiện dành cho khách hàng thành thị.',
            products: { groups: ['Váy linen', 'Áo sơ mi', 'Phụ kiện'] },
            audiences: { primary: 'Nữ 25–40 tuổi tại các thành phố lớn' },
            goals: ['Traffic', 'Leads', 'Revenue'],
            brandVoice: { tone: ['Tinh tế', 'Gần gũi', 'Tự tin'] },
            onboardingData: { facebookPageUrl: 'https://facebook.com/atelier.no8', searchConsoleRequested: true },
          },
        },
      },
    },
    create: {
      name: 'Atelier No.8',
      slug: 'atelier-no-8',
      createdById: user.id,
      onboardingStatus: OnboardingStatus.COMPLETED,
      onboardingStep: OnboardingStep.COMPLETE,
      companyProfile: {
        create: {
          legalName: 'Atelier No.8',
          website: 'https://atelier-no8.example.com',
          country: 'VN',
          language: 'vi',
          timezone: 'Asia/Ho_Chi_Minh',
          industry: 'Fashion',
          subIndustries: ['Linen', 'Accessories'],
          businessModel: 'B2C',
          description: 'Thời trang linen và phụ kiện dành cho khách hàng thành thị.',
          products: { groups: ['Váy linen', 'Áo sơ mi', 'Phụ kiện'] },
          audiences: { primary: 'Nữ 25–40 tuổi tại các thành phố lớn' },
          goals: ['Traffic', 'Leads', 'Revenue'],
          brandVoice: { tone: ['Tinh tế', 'Gần gũi', 'Tự tin'] },
          onboardingData: { facebookPageUrl: 'https://facebook.com/atelier.no8', searchConsoleRequested: true },
        },
      },
    },
  })

  await prisma.membership.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
    update: { role: WorkspaceRole.ADMIN },
    create: { userId: user.id, workspaceId: workspace.id, role: WorkspaceRole.ADMIN },
  })

  for (const account of [
    { email: 'marketer@milo.local', name: 'Milo Marketer', role: WorkspaceRole.MARKETER },
    { email: 'sales@milo.local', name: 'Milo Sales', role: WorkspaceRole.SALES },
  ]) {
    const member = await prisma.user.upsert({
      where: { email: account.email },
      update: { name: account.name, passwordHash },
      create: { email: account.email, name: account.name, passwordHash, emailVerifiedAt: new Date() },
    })
    await prisma.membership.upsert({
      where: { userId_workspaceId: { userId: member.id, workspaceId: workspace.id } },
      update: { role: account.role },
      create: { userId: member.id, workspaceId: workspace.id, role: account.role },
    })
  }

  console.log('Seeded admin, marketer and sales demo accounts / MiloDemo123!')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
