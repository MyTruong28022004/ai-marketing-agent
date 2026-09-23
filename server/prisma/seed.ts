import { DocumentStatus, DocumentType, OnboardingStatus, OnboardingStep, PrismaClient, ProjectStatus, WorkspaceRole } from '@prisma/client'
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

  const topics = [
    { slug: 'cong-nghe-chuyen-doi-so', name: 'Công nghệ & chuyển đổi số', industry: 'Công nghệ & hạ tầng', description: 'Nhu cầu số hóa quy trình, hiện đại hóa vận hành và đổi mới công nghệ trong doanh nghiệp.', sortOrder: 10, active: true },
    { slug: 'ai-tu-dong-hoa', name: 'AI & tự động hóa', industry: 'Công nghệ & hạ tầng', description: 'Ứng dụng AI, workflow automation và trợ lý thông minh để giảm chi phí, tăng năng suất.', sortOrder: 20, active: true },
    { slug: 'phan-mem-b2b-saas', name: 'Phần mềm B2B & SaaS', industry: 'Công nghệ & hạ tầng', description: 'Nhu cầu tìm kiếm, triển khai và thay thế phần mềm SaaS cho doanh nghiệp.', sortOrder: 30, active: true },
    { slug: 'du-lieu-phan-tich', name: 'Dữ liệu & phân tích', industry: 'Dữ liệu & tăng trưởng', description: 'Business intelligence, data platform, dashboard và insight hỗ trợ quyết định.', sortOrder: 40, active: true },
    { slug: 'cloud-ha-tang', name: 'Cloud & hạ tầng', industry: 'Công nghệ & hạ tầng', description: 'Cloud, hosting, DevOps, hạ tầng mở rộng và tối ưu hiệu năng hệ thống.', sortOrder: 50, active: true },
    { slug: 'an-ninh-mang', name: 'An ninh mạng', industry: 'Công nghệ & hạ tầng', description: 'Bảo mật, quản trị rủi ro, compliance và bảo vệ dữ liệu doanh nghiệp.', sortOrder: 60, active: true },
    { slug: 'crm-ban-hang', name: 'CRM & bán hàng', industry: 'Kinh doanh & vận hành', description: 'Quản lý khách hàng, lead generation, sales pipeline và tự động hóa bán hàng.', sortOrder: 70, active: true },
    { slug: 'marketing-tang-truong', name: 'Marketing & tăng trưởng', industry: 'Dữ liệu & tăng trưởng', description: 'MarTech, demand generation, attribution và các cách tăng trưởng có thể đo lường.', sortOrder: 80, active: true },
    { slug: 'nang-suat-cong-tac', name: 'Năng suất & cộng tác', industry: 'Kinh doanh & vận hành', description: 'Công cụ làm việc, quản lý dự án, cộng tác từ xa và tối ưu năng suất đội nhóm.', sortOrder: 90, active: true },
    { slug: 'tich-hop-api', name: 'Tích hợp & API', industry: 'Công nghệ & hạ tầng', description: 'API, integration, kết nối hệ thống và tự động hóa luồng dữ liệu giữa các công cụ.', sortOrder: 100, active: true },
    { slug: 'thuong-mai-dien-tu-ban-le', name: 'Thương mại điện tử & công nghệ bán lẻ', industry: 'Thương mại & bán lẻ', description: 'Nền tảng bán hàng, retail tech, thanh toán và trải nghiệm khách hàng đa kênh.', sortOrder: 110, active: true },
    { slug: 'nganh-use-case-doanh-nghiep', name: 'Ngành & use case doanh nghiệp', industry: 'Chiến lược & giải pháp', description: 'Nhu cầu công nghệ theo ngành, quy mô doanh nghiệp và bài toán vận hành cụ thể.', sortOrder: 120, active: true },
    { slug: 'so-sanh-giai-phap-cong-nghe', name: 'So sánh & đánh giá giải pháp', industry: 'Chiến lược & giải pháp', description: 'Từ khóa có ý định mua: so sánh nhà cung cấp, review sản phẩm và tiêu chí lựa chọn.', sortOrder: 130, active: true },
    { slug: 'roi-chi-phi-hieu-qua', name: 'ROI, chi phí & hiệu quả đầu tư', industry: 'Chiến lược & giải pháp', description: 'Nhu cầu về pricing, TCO, ROI, cost saving và business case trước khi mua.', sortOrder: 140, active: true },
  ]

  for (const topic of topics) {
    await prisma.topic.upsert({
      where: { slug: topic.slug },
      update: topic,
      create: topic,
    })
  }

  await prisma.topic.updateMany({
    where: { slug: { in: ['san-pham-giai-phap', 'huong-dan-kien-thuc', 'xu-huong-nganh', 'so-sanh-danh-gia', 'gia-khuyen-mai', 'mua-vu-su-kien', 'khach-hang-dia-phuong', 'y-tuong-noi-dung'] } },
    data: { active: false },
  })

  const productKnowledgeWorkspaceId = '259c4a41-e11d-4453-9f04-4e985fa3c4cd'
  const productKnowledgeWorkspace = await prisma.workspace.findUnique({
    where: { id: productKnowledgeWorkspaceId },
    select: { id: true, createdById: true },
  })

  if (!productKnowledgeWorkspace) {
    console.warn(`Skipped product knowledge seed: workspace ${productKnowledgeWorkspaceId} was not found.`)
  } else {
    const projectName = 'Product Knowledge - Sample Technology Products'
    const existingProject = await prisma.project.findFirst({
      where: { workspaceId: productKnowledgeWorkspace.id, name: { in: ['Product Knowledge', projectName] } },
      select: { id: true },
    })
    const project = existingProject
      ? await prisma.project.update({
          where: { id: existingProject.id },
          data: { name: projectName, description: 'Bộ tài liệu product mẫu để AI đối chiếu keyword trend với sản phẩm của workspace.', status: ProjectStatus.ACTIVE },
          select: { id: true },
        })
      : await prisma.project.create({
          data: {
            workspaceId: productKnowledgeWorkspace.id,
            name: projectName,
            description: 'Bộ tài liệu product mẫu để AI đối chiếu keyword trend với sản phẩm của workspace.',
            status: ProjectStatus.ACTIVE,
            createdById: productKnowledgeWorkspace.createdById,
          },
          select: { id: true },
        })

    const products = [
      {
        name: 'Milo Flow',
        slug: 'milo-flow',
        description: 'Nền tảng SaaS B2B cho workflow automation, approval và API integration.',
        tags: ['product', 'saas', 'workflow-automation', 'ai', 'b2b'],
        content: `# Milo Flow

## Trạng thái tài liệu
Đây là product mẫu dùng cho workspace test. Không dùng tài liệu này để khẳng định khách hàng, giá bán, doanh thu hoặc kết quả triển khai thực tế.

## Mô tả sản phẩm
Milo Flow là phần mềm SaaS B2B giúp doanh nghiệp thiết kế và tự động hóa workflow có nhiều bước, có phê duyệt, phân quyền và kết nối dữ liệu giữa các công cụ. Sản phẩm phù hợp với các đội ngũ đang xử lý công việc lặp lại bằng email, spreadsheet hoặc thao tác chuyển dữ liệu thủ công.

## Người dùng và người mua phù hợp
- Operations Manager, RevOps, Sales Operations, Marketing Operations, Customer Success Operations.
- Doanh nghiệp vừa và lớn có nhiều bước bàn giao giữa marketing, sales, vận hành và chăm sóc khách hàng.
- Người mua quan tâm đến giảm thao tác thủ công, kiểm soát SLA, khả năng audit và tích hợp hệ thống.

## Năng lực chính
- Trình thiết kế workflow trực quan với trigger, điều kiện, nhánh xử lý và bước phê duyệt.
- Tự động hóa lead routing, tạo task, nhắc hạn và cập nhật trạng thái giữa các đội nhóm.
- Kết nối API/webhook với CRM, helpdesk, email, spreadsheet và công cụ nội bộ.
- Phân quyền theo vai trò, audit log và theo dõi lịch sử xử lý.
- Có thể dùng AI để gợi ý bước workflow hoặc tóm tắt yêu cầu, nhưng không thay thế phê duyệt của con người.

## Use case ưu tiên
- Tự động phân loại và phân phối lead cho sales.
- Quy trình duyệt nội dung, campaign và yêu cầu thay đổi website.
- Đồng bộ ticket hỗ trợ với task của đội kỹ thuật hoặc customer success.
- Onboarding khách hàng có checklist, người phụ trách và SLA.

## Keyword phù hợp
workflow automation, business process automation, no-code automation, lead routing automation, approval workflow, sales workflow, marketing operations automation, API workflow integration, tự động hóa quy trình doanh nghiệp, phần mềm quản lý quy trình.

## Keyword không phù hợp hoặc cần loại trừ
AI tạo ảnh cho người tiêu dùng, phần cứng máy chủ, game, mạng xã hội cho người dùng cá nhân, phần mềm kế toán chuyên sâu, ERP thay thế toàn bộ doanh nghiệp, công cụ quản lý hạ tầng cloud hoặc antivirus.

## Quy tắc đối chiếu
Đánh giá là FIT khi keyword nói về tự động hóa quy trình, workflow, approval, routing, integration hoặc vận hành liên phòng ban. Đánh giá là PARTIAL khi keyword nói rộng về AI năng suất nhưng chưa thể hiện nhu cầu workflow. Đánh giá là NOT_FIT khi keyword tập trung vào bảo mật cloud, phân tích dữ liệu chuyên sâu hoặc một ngành không cần workflow.`
      },
      {
        name: 'Milo Insight',
        slug: 'milo-insight',
        description: 'Nền tảng SaaS cho marketing analytics, customer data và attribution.',
        tags: ['product', 'saas', 'analytics', 'customer-data', 'marketing'],
        content: `# Milo Insight

## Trạng thái tài liệu
Đây là product mẫu dùng cho workspace test. Không dùng tài liệu này để khẳng định khách hàng, giá bán, doanh thu hoặc kết quả triển khai thực tế.

## Mô tả sản phẩm
Milo Insight là nền tảng SaaS phân tích marketing và customer data giúp doanh nghiệp hợp nhất dữ liệu từ CRM, quảng cáo, website và các kênh bán hàng để theo dõi funnel, attribution và hiệu quả chiến dịch. Sản phẩm tập trung vào việc biến dữ liệu phân tán thành dashboard và insight có thể dùng cho quyết định marketing, sales và revenue operations.

## Người dùng và người mua phù hợp
- Head of Marketing, Growth Lead, Demand Generation, RevOps, Sales Analytics và lãnh đạo cần theo dõi hiệu quả tăng trưởng.
- Công ty B2B SaaS, công nghệ và dịch vụ có nhiều nguồn lead hoặc nhiều kênh marketing.
- Người mua cần nối dữ liệu, chuẩn hóa định nghĩa funnel và nhìn được mối liên hệ giữa chi phí marketing, lead, pipeline và doanh thu.

## Năng lực chính
- Kết nối và chuẩn hóa dữ liệu CRM, quảng cáo, web analytics và form lead.
- Dashboard cho funnel, campaign performance, source/medium, pipeline và conversion.
- Phân tích attribution theo nhiều touchpoint với giải thích rõ dữ liệu thiếu hoặc giới hạn.
- Theo dõi cohort, lead quality, tốc độ chuyển đổi và hiệu quả theo segment.
- AI tóm tắt biến động và gợi ý câu hỏi phân tích, nhưng không bịa metric khi dữ liệu chưa đủ.

## Use case ưu tiên
- Theo dõi marketing funnel từ impression/lead đến pipeline.
- So sánh hiệu quả Google Ads, social, email, content và partner channel.
- Tìm điểm rơi trong funnel và nhóm lead có chất lượng thấp.
- Xây dựng dashboard dùng chung cho marketing, sales và ban điều hành.

## Keyword phù hợp
marketing analytics, customer data platform, campaign attribution, marketing dashboard, revenue analytics, lead quality analytics, funnel reporting, customer journey analytics, phân tích hiệu quả marketing, dashboard marketing, đo lường chuyển đổi.

## Keyword không phù hợp hoặc cần loại trừ
phần mềm workflow automation thuần túy, cloud hosting, cloud security, antivirus, quản lý thiết bị, phần mềm kế toán, công cụ thiết kế đồ họa, nền tảng thương mại điện tử checkout.

## Quy tắc đối chiếu
Đánh giá là FIT khi keyword nói về analytics, dashboard, attribution, funnel, customer data, campaign measurement hoặc revenue reporting. Đánh giá là PARTIAL khi keyword nói về CRM hoặc marketing automation nhưng trọng tâm chưa phải phân tích. Đánh giá là NOT_FIT khi keyword tập trung vào bảo mật, hạ tầng cloud hoặc tự động hóa workflow mà không có nhu cầu đo lường.`
      },
      {
        name: 'Milo SecureCloud',
        slug: 'milo-securecloud',
        description: 'Nền tảng SaaS cho cloud security, IAM, CSPM và compliance.',
        tags: ['product', 'saas', 'cloud-security', 'compliance', 'devsecops'],
        content: `# Milo SecureCloud

## Trạng thái tài liệu
Đây là product mẫu dùng cho workspace test. Không dùng tài liệu này để khẳng định khách hàng, chứng nhận, giá bán, doanh thu hoặc kết quả bảo mật thực tế.

## Mô tả sản phẩm
Milo SecureCloud là phần mềm SaaS giúp đội ngũ công nghệ quan sát rủi ro trên môi trường cloud, phát hiện cấu hình sai, theo dõi quyền truy cập và chuẩn bị bằng chứng cho các quy trình compliance. Sản phẩm hỗ trợ security, DevOps và engineering phối hợp xử lý rủi ro theo mức độ ưu tiên.

## Người dùng và người mua phù hợp
- CTO, CISO, Cloud Security Engineer, DevOps, Platform Engineer và IT Compliance.
- Công ty vận hành workload trên AWS, Azure, Google Cloud hoặc môi trường cloud lai.
- Người mua quan tâm đến cloud posture, IAM, vulnerability, compliance evidence và giảm thời gian kiểm tra thủ công.

## Năng lực chính
- Kiểm tra cloud configuration và phát hiện policy/risk cần xử lý.
- Theo dõi identity, permission, quyền quá mức và thay đổi bất thường.
- Quản lý finding theo mức độ nghiêm trọng, owner, deadline và trạng thái khắc phục.
- Báo cáo evidence cho các framework compliance phổ biến theo phạm vi được cấu hình.
- Tích hợp thông báo và ticketing để chuyển finding vào quy trình xử lý.

## Use case ưu tiên
- Cloud security posture management cho nhiều account hoặc project.
- Chuẩn bị evidence cho SOC 2, ISO 27001 hoặc quy trình kiểm toán nội bộ; không mặc định sản phẩm cấp chứng nhận.
- Rà soát IAM và quyền truy cập của đội ngũ cloud.
- Theo dõi remediation của misconfiguration và vulnerability.

## Keyword phù hợp
cloud security, cloud security posture management, CSPM, cloud compliance, IAM security, cloud misconfiguration, DevSecOps, vulnerability management, SOC 2 readiness, ISO 27001 cloud security, bảo mật hạ tầng cloud.

## Keyword không phù hợp hoặc cần loại trừ
marketing analytics, content marketing, workflow approval, CRM sales, công cụ email marketing, thiết kế website, phần mềm nhân sự, antivirus cho máy tính cá nhân, quản lý tồn kho bán lẻ.

## Quy tắc đối chiếu
Đánh giá là FIT khi keyword nói về cloud security, CSPM, IAM, compliance, DevSecOps, misconfiguration hoặc vulnerability. Đánh giá là PARTIAL khi keyword nói chung về cybersecurity nhưng chưa có ngữ cảnh cloud/doanh nghiệp. Đánh giá là NOT_FIT khi keyword tập trung vào marketing, sales, analytics hoặc phần mềm vận hành không liên quan bảo mật.`
      },
    ]

    for (const product of products) {
      const productRecord = await prisma.product.upsert({
        where: { workspaceId_slug: { workspaceId: productKnowledgeWorkspace.id, slug: product.slug } },
        update: { name: product.name, description: product.description, status: 'ACTIVE' },
        create: {
          workspaceId: productKnowledgeWorkspace.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          status: 'ACTIVE',
        },
        select: { id: true },
      })
      const document = await prisma.document.findFirst({
        where: { projectId: project.id, name: product.name },
        select: { id: true },
      }) || await prisma.document.create({
        data: {
          projectId: project.id,
          productId: productRecord.id,
          name: product.name,
          type: DocumentType.PRODUCT,
          status: DocumentStatus.READY,
          tags: product.tags,
          uploadedById: productKnowledgeWorkspace.createdById,
        },
        select: { id: true },
      })

      await prisma.document.update({
        where: { id: document.id },
        data: { productId: productRecord.id, type: DocumentType.PRODUCT, status: DocumentStatus.READY, tags: product.tags },
      })

      const version = await prisma.documentVersion.upsert({
        where: { documentId_version: { documentId: document.id, version: 1 } },
        update: {
          mimeType: 'text/markdown',
          sizeBytes: Buffer.byteLength(product.content, 'utf8'),
          extractedText: product.content,
        },
        create: {
          documentId: document.id,
          version: 1,
          mimeType: 'text/markdown',
          sizeBytes: Buffer.byteLength(product.content, 'utf8'),
          extractedText: product.content,
        },
        select: { id: true },
      })

      await prisma.documentChunk.deleteMany({ where: { documentVersionId: version.id } })
      await prisma.documentChunk.create({
        data: {
          documentVersionId: version.id,
          position: 0,
          content: product.content,
          metadata: { productName: product.name, sample: true, source: 'seed' },
        },
      })
    }

    console.log(`Seeded ${products.length} product knowledge documents for workspace ${productKnowledgeWorkspaceId}.`)
  }

  console.log('Seeded topics and product knowledge sample data.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
