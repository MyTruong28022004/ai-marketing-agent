# Milo — AI Marketing

Milo là giao diện SaaS cho một nhân viên marketing AI dành cho SME và startup. Sản phẩm hướng đến trải nghiệm đơn giản: AI chủ động phân tích, đề xuất kế hoạch, tạo tài sản marketing và đưa mọi hành động quan trọng qua bước phê duyệt của con người.

## Ý nghĩa tên Milo

Milo được chọn vì ngắn, thân thiện, dễ đọc bằng tiếng Việt và tiếng Anh, đồng thời tạo cảm giác đây là một đồng đội thay vì một công cụ enterprise phức tạp.

Trong hệ thống thương hiệu, Milo được diễn giải là:

**Marketing Intelligence & Launch Orchestrator**

- Marketing: tập trung vào toàn bộ vòng đời marketing.
- Intelligence: phân tích dữ liệu và biến dữ liệu thành đề xuất dễ hiểu.
- Launch: hỗ trợ đưa nội dung, chiến dịch và sản phẩm ra thị trường.
- Orchestrator: điều phối Content, Social, Ads, Email, SEO và Analytics.

Đây là định nghĩa thương hiệu của sản phẩm, không phải một thuật ngữ kỹ thuật hay tên model AI.

## Trạng thái hiện tại

Frontend hiện là một MVP tương tác tập trung vào dashboard và product shell.

Đã hoàn thiện:

- Đăng ký, đăng nhập, khôi phục phiên và đăng xuất kết nối backend thật.
- Route bảo vệ và workspace switcher theo membership.
- Onboarding doanh nghiệp 8 bước với lưu tiến trình.
- Thiết lập website, Facebook Page và competitor watchlist.
- Màn hình Radar đối thủ với quyền xem/sửa theo role.
- Dashboard tổng quan đa kênh.
- KPI tiếp cận, tương tác, leads và doanh thu ước tính.
- Biểu đồ hiệu suất theo thời gian.
- Hàng chờ phê duyệt tác vụ AI.
- Duyệt từng tác vụ và duyệt hàng loạt.
- Lịch nội dung tuần.
- Theo dõi sức khỏe các kênh.
- Thẻ AI Agent và công tắc Autopilot.
- Chat drawer với prompt gợi ý và phản hồi mô phỏng.
- Điều hướng bằng URL cho tất cả module chính.
- Responsive cho desktop, tablet và mobile.
- Production build bằng Vite.

Đang ở dạng màn hình tổng quan, cần phát triển workflow chi tiết:

- Weekly Plan.
- AI Agent workspace.
- Content Studio.
- Social Media Manager.
- Ads Center.
- Email và Leads.
- Analytics nâng cao.
- Brand Brain.
- Integrations.

Dữ liệu dashboard hiện vẫn là mock data phía frontend. Backend foundation đã được bổ sung trong thư mục `server/` với authentication, workspace đa công ty, RBAC, onboarding và competitor watchlist. Kết nối API mạng xã hội và thay mock data trên dashboard sẽ được thực hiện theo từng vertical slice.

## Công nghệ

| Thành phần | Công nghệ | Phiên bản |
| --- | --- | --- |
| UI runtime | React | 19.1.1 |
| DOM renderer | React DOM | 19.1.1 |
| Routing | React Router DOM | 7.18.3 |
| Build tool | Vite | 6.4.3 |
| Biểu đồ | Recharts | 2.15.0 |
| Icon | Lucide React | 0.468.0 |
| Styling | CSS thuần và CSS variables | Nội bộ |

Project không phụ thuộc vào một component framework lớn. Design system được viết trực tiếp trong src/styles.css để dễ kiểm soát nhận diện và giảm độ phức tạp khi phát triển MVP.

## Yêu cầu môi trường

- Node.js 20 trở lên. Môi trường hiện đã kiểm tra với Node.js 22.6.0.
- npm 10 trở lên.
- Docker Desktop hoặc PostgreSQL cài trực tiếp để chạy backend.
- Trình duyệt hiện đại: Edge, Chrome, Firefox hoặc Safari.

## Cài đặt

Clone hoặc mở thư mục project, sau đó chạy:

    cd ai-marketing-agent
    npm install
    npm install --prefix server
    Copy-Item .env.example server/.env
    npm run db:up
    npm run db:deploy
    npm run db:seed
    npm run dev:all

Vite mặc định phục vụ ứng dụng tại:

    http://localhost:5173

Backend phục vụ REST API tại:

    http://localhost:3101/api

Tài khoản seed dành cho local development:

    admin@milo.local / MiloDemo123!

Script dev dùng host 0.0.0.0 nên thiết bị khác trong cùng mạng LAN cũng có thể truy cập qua địa chỉ Network mà Vite in trong terminal. Việc truy cập còn phụ thuộc Windows Firewall và cấu hình mạng.

## Các lệnh thường dùng

Khởi động development server:

    npm run dev

Build production:

    npm run build

Chạy thử bản production đã build:

    npm run preview

Kiểm tra dependency:

    npm audit

Thư mục đầu ra production là dist.

## URL các màn hình

| Màn hình | URL |
| --- | --- |
| Dashboard | http://localhost:5173/ |
| Kế hoạch tuần | http://localhost:5173/weekly-plan |
| AI Agent | http://localhost:5173/ai-agent |
| Content Studio | http://localhost:5173/content-studio |
| Mạng xã hội | http://localhost:5173/social-media |
| Ads Center | http://localhost:5173/ads-center |
| Email và Leads | http://localhost:5173/email-leads |
| Analytics | http://localhost:5173/analytics |
| Brand Brain | http://localhost:5173/brand-brain |
| Tích hợp | http://localhost:5173/integrations |

React Router quản lý URL phía client. Khi deploy, web server phải được cấu hình SPA fallback để mọi đường dẫn trả về index.html.

## Cấu trúc project

    ai-marketing-agent/
    ├── docker-compose.yml
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── README.md
    ├── server/
    │   ├── prisma/
    │   │   ├── migrations/
    │   │   ├── schema.prisma
    │   │   └── seed.ts
    │   └── src/
    │       ├── auth/
    │       ├── common/
    │       ├── competitors/
    │       ├── prisma/
    │       └── workspaces/
    ├── public/
    └── src/
        ├── main.jsx
        ├── App.jsx
        └── styles.css

Vai trò từng file:

- index.html: HTML shell, metadata, font và entry script.
- src/main.jsx: mount React, StrictMode và BrowserRouter.
- src/App.jsx: route map, dữ liệu demo và toàn bộ component hiện tại.
- src/styles.css: design tokens, layout, component styles và responsive breakpoints.
- package.json: dependency và npm scripts.

App.jsx hiện được giữ trong một file để prototype nhanh. Khi bắt đầu phát triển module thật, cần tách theo cấu trúc đề xuất bên dưới.

## Cấu trúc đề xuất cho giai đoạn tiếp theo

    src/
    ├── app/
    │   ├── AppRouter.jsx
    │   └── AppShell.jsx
    ├── components/
    │   ├── layout/
    │   ├── ui/
    │   ├── charts/
    │   └── feedback/
    ├── features/
    │   ├── dashboard/
    │   ├── weekly-plan/
    │   ├── agent/
    │   ├── content-studio/
    │   ├── social/
    │   ├── ads/
    │   ├── email-leads/
    │   ├── analytics/
    │   ├── brand-brain/
    │   └── integrations/
    ├── hooks/
    ├── lib/
    ├── services/
    ├── styles/
    └── main.jsx

Mỗi feature nên chứa page, component, hook, schema và service của riêng nó. Component dùng chung chỉ được đưa vào components khi đã có ít nhất hai nơi sử dụng thực tế.

## Kiến trúc sản phẩm

Luồng tương tác mục tiêu:

    Business Profile và Brand Brain
                    │
                    ▼
              Milo AI Agent
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
    Content       Campaign     Analytics
       │            │            │
       └────────────┼────────────┘
                    ▼
             Approval Queue
                    │
                    ▼
        Publish, Send hoặc Launch

Nguyên tắc quan trọng: AI có thể chuẩn bị và đề xuất tự động, nhưng đăng bài, gửi email hoặc chạy quảng cáo phải đi qua Approval Workflow trừ khi người dùng chủ động cấu hình quyền Autopilot phù hợp.

## Component hiện có

Các component chính trong App.jsx:

- Logo: logo và wordmark Milo.
- Sidebar: workspace switcher, điều hướng và thông tin gói.
- Header: tìm kiếm, trạng thái hệ thống, thông báo và nút mở AI chat.
- MetricCard: thẻ KPI tái sử dụng.
- ActivityChart: biểu đồ chuyển đổi và bộ lọc thời gian.
- ApprovalQueue: danh sách tác vụ chờ duyệt.
- AgentCard: trạng thái AI Agent và Autopilot.
- QuickActions: hành động marketing nhanh.
- Schedule: lịch nội dung bảy ngày.
- ChannelHealth: hiệu suất từng kênh.
- ChatDrawer: trải nghiệm giao việc bằng ngôn ngữ tự nhiên.
- PlaceholderView: product shell tạm thời cho các module chưa có workflow chi tiết.

## Routing

Route được khai báo bằng hai map routePaths và pathRoutes trong App.jsx.

Khi thêm màn hình mới:

1. Thêm tên và icon vào navGroups nếu màn hình xuất hiện trong sidebar.
2. Thêm cặp tên và đường dẫn vào routePaths.
3. Tạo page component tương ứng.
4. Thay PlaceholderView bằng page component theo pathname.
5. Kiểm tra mở trực tiếp URL và refresh trình duyệt.

Không dùng chuỗi URL rải rác trong component. Route name và path phải có một nguồn dữ liệu thống nhất.

## Design system

Tinh thần hình ảnh:

- Professional nhưng thân thiện với chủ doanh nghiệp nhỏ.
- Mật độ thông tin vừa phải, tránh cảm giác enterprise dashboard quá nặng.
- Xanh lá trầm đại diện cho tăng trưởng, sự tin cậy và khả năng kiểm soát.
- Serif được dùng có chủ đích cho headline và số liệu lớn.
- Sans-serif được dùng cho điều hướng, nhãn và nội dung vận hành.

Design tokens chính trong styles.css:

| Token | Vai trò |
| --- | --- |
| --green | Primary action và trạng thái thương hiệu |
| --green-dark | Hover hoặc emphasis đậm |
| --ink | Nội dung chính |
| --muted | Nội dung phụ |
| --line | Border và divider |
| --surface | Card và panel background |

Không thêm màu mới trực tiếp nếu màu đó sẽ được dùng lại. Hãy tạo semantic token trước để hỗ trợ dark mode và theme theo brand trong tương lai.

## Responsive

Các breakpoint hiện tại:

- Trên 1180px: dashboard hai cột với AI Agent ở cột phải.
- Từ 861px đến 1180px: panel phụ chuyển xuống dưới.
- Từ 601px đến 860px: sidebar trở thành mobile drawer.
- Từ 400px đến 600px: KPI và quick action giảm số cột.
- Dưới 400px: card hiển thị một cột.

Khi thêm component mới, luôn kiểm tra ít nhất các viewport 1440, 1024, 768 và 390 pixel.

## Dữ liệu và state

Hiện dữ liệu demo nằm trong App.jsx:

- navGroups.
- chartData.
- initialTasks.
- metrics.
- channel data và schedule data cục bộ.

State đang dùng React hooks cho:

- Active route qua React Router.
- Mobile sidebar.
- AI chat drawer.
- Toast notification.
- Autopilot toggle.
- Approval queue.
- Chart range.

Khi kết nối backend, không nên gọi fetch trực tiếp trong component trình bày. Đưa API client vào services và dùng một lớp server-state riêng như TanStack Query nếu số endpoint tăng lên.

## API dự kiến

Frontend nên tích hợp backend qua các nhóm endpoint sau:

| Nhóm | Ví dụ trách nhiệm |
| --- | --- |
| auth | Đăng nhập, refresh token, session |
| brands | Business Profile, Brand Voice, Brand Kit |
| knowledge | Upload và quản lý Knowledge Base |
| plans | Weekly Plan và mục tiêu marketing |
| content | Tạo, sửa, dịch và repurpose nội dung |
| social | Kết nối kênh, lịch đăng và inbox |
| campaigns | Ads brief, creative variants và ngân sách |
| approvals | Duyệt, từ chối và audit log |
| analytics | KPI, attribution, ROI và AI insight |
| agent | Chat, tool execution và task status |

Mọi response nên có request id để hỗ trợ tracing. Tác vụ AI dài nên trả về job id và cập nhật trạng thái qua polling hoặc server-sent events.

## Quy ước phát triển

- Ưu tiên functional component và hooks.
- Component dùng PascalCase.
- Biến và function dùng camelCase.
- Route dùng kebab-case.
- Event handler bắt đầu bằng handle khi được khai báo trong component.
- Không hard-code token bí mật trong frontend.
- Không commit file env chứa credential.
- Nội dung hiển thị cho người dùng hiện ưu tiên tiếng Việt.
- Dữ liệu tiền tệ phải ghi rõ đơn vị và locale.
- Hành động có rủi ro cần trạng thái loading, confirmation và error rõ ràng.
- Mọi hành động AI có ảnh hưởng bên ngoài phải thể hiện bước phê duyệt.

## Git workflow đề xuất

- main: nhánh ổn định có thể deploy.
- develop: nhánh tích hợp nếu đội chọn Git Flow.
- feature/tên-tính-năng: phát triển tính năng.
- fix/tên-lỗi: sửa lỗi.

Commit nên nhỏ, có một mục đích rõ ràng. Ví dụ:

    feat: add content approval detail drawer
    fix: import React for classic JSX runtime
    docs: document local setup and routes

Pull request cần có:

- Mô tả thay đổi.
- Ảnh hoặc video với thay đổi UI.
- Các viewport đã kiểm tra.
- Trạng thái build.
- Ảnh hưởng API hoặc migration nếu có.
- Known limitations.

## Kiểm tra trước khi tạo pull request

    npm install
    npm run build
    npm audit --audit-level=moderate

Kiểm tra thủ công:

- Mở Dashboard.
- Mở trực tiếp từng URL module.
- Refresh tại route con.
- Mở và đóng mobile sidebar.
- Mở AI chat và gửi prompt.
- Duyệt từng task và duyệt hàng loạt.
- Thay đổi chart range.
- Kiểm tra không có error màu đỏ trong browser console.

Project chưa cấu hình test runner và linter. Nên bổ sung ESLint, Vitest và Testing Library trước khi bắt đầu tích hợp backend.

## Deployment

Build production bằng:

    npm run build

Deploy toàn bộ nội dung thư mục dist lên static hosting.

Yêu cầu bắt buộc với hosting: mọi route không trỏ tới file tĩnh phải fallback về index.html. Nếu thiếu cấu hình này, truy cập trực tiếp một URL như content-studio sẽ trả về 404 dù navigation trong app vẫn hoạt động.

Các nền tảng phù hợp:

- Vercel.
- Netlify.
- Cloudflare Pages.
- AWS S3 kết hợp CloudFront.
- Nginx hoặc Caddy tự quản lý.

Biến môi trường public của Vite phải có tiền tố VITE_. Không đưa API secret, access token mạng xã hội hoặc khóa thanh toán vào biến frontend.

## Troubleshooting

### Trang trắng và React is not defined

App.jsx phải import namespace React vì cấu hình JSX hiện tại có thể sử dụng classic runtime:

    import React, { useMemo, useState } from 'react'

Sau khi sửa, nhấn Ctrl và F5 hoặc đóng tab cũ rồi mở lại.

### Port 5173 đang được sử dụng

Vite sẽ tự chọn port tiếp theo, ví dụ 5174. Dùng đúng Local URL được in trong terminal.

### Route con trả về 404 khi deploy

Cấu hình SPA fallback để server trả index.html cho route chưa khớp file tĩnh.

### Font không tải được

Ứng dụng hiện tải Manrope và Newsreader từ Google Fonts. Trong môi trường không có internet, trình duyệt sẽ dùng font fallback. Nếu cần chạy hoàn toàn nội bộ, tải font về public/fonts và khai báo bằng font-face.

### Dependency hoặc cache không đồng bộ

Chạy lại:

    npm install
    npm run dev

Sau đó hard refresh trình duyệt. Không dùng force audit fix nếu chưa kiểm tra breaking change.

## Bảo mật

- Lần kiểm tra gần nhất: npm audit trả về 0 vulnerability.
- Không lưu access token lâu dài trong localStorage nếu có lựa chọn an toàn hơn.
- Backend phải kiểm tra quyền Owner, Marketer và Viewer cho mọi action.
- Approval không chỉ là trạng thái UI; backend phải xác thực approval trước khi publish hoặc spend ngân sách.
- File Knowledge Base phải được kiểm tra loại file, dung lượng và malware.
- Audit log cần bất biến ở mức ứng dụng và ghi lại actor, action, resource, timestamp.

## Roadmap frontend đề xuất

### Giai đoạn 1 — Hoàn thiện nền tảng

- Tách App.jsx theo feature.
- Thêm ESLint, formatter và test runner.
- Tạo component library nội bộ.
- Thêm error boundary, loading skeleton và empty state.
- Hoàn thiện onboarding và Brand Brain wizard.

### Giai đoạn 2 — Workflow marketing

- Content editor với AI generation history.
- Calendar kéo thả.
- Social composer đa nền tảng.
- Approval detail drawer và version comparison.
- Ads campaign brief wizard.

### Giai đoạn 3 — Agent và dữ liệu thật

- Streaming Agent Chat.
- Task execution timeline.
- Notification center.
- Analytics filter và attribution.
- Role-based access control.
- Multi-brand workspace.

## Nguyên tắc sản phẩm

1. Setup ban đầu dưới 15 phút.
2. AI luôn đề xuất bước tiếp theo thay vì để người dùng tự tìm.
3. Nội dung và insight phải bám Brand Brain.
4. Mọi hành động có rủi ro phải minh bạch và có thể kiểm soát.
5. Dashboard phải trả lời được ba câu hỏi: điều gì hiệu quả, điều gì không và nên làm gì tiếp theo.

## Liên hệ nội bộ

Khi bàn giao cho thành viên mới, hãy cung cấp thêm các thông tin chưa nằm trong repository:

- Link thiết kế hoặc Figma nếu có.
- API specification.
- Tài khoản môi trường development.
- Quy trình cấp quyền integration sandbox.
- Owner của từng module.
- Definition of Done của sprint hiện tại.

---

Milo được xây dựng để biến marketing đa kênh thành một luồng công việc đơn giản: hiểu thương hiệu, đề xuất kế hoạch, tạo nội dung, xin phê duyệt, thực thi và học từ kết quả.

---
## Bổ sung: chạy MinIO, ChromaDB và Ollama local

Phần này bổ sung hướng dẫn hạ tầng local cho luồng Knowledge Base của Milo. Các mô tả và hướng dẫn cũ ở phía trên được giữ nguyên.

### Tải MinIO
~~~powershell
1. Mở powershell
2. nhập: docker pull quay.io/minio/minio
3: docker images
4. Tạo vùng lưu trữ cho MinIO: docker volume create minio_data
5. Chạy MinIO: docker run -d --name minio -p 9000:9000 -p 9001:9001 -e "MINIO_ROOT_USER=minioadmin" -e "MINIO_ROOT_PASSWORD=MinioLocal_ChangeMe_2026_9xQ" -v minio_data:/data quay.io/minio/minio:latest server /data --console-address ":9001"
6. Mở mino: http://localhost:9001
7. Đăng nhập:
			Username: minioadmin
			Password: MinioLocal_ChangeMe_2026_9xQ
8. Tạo bucket: milo-app-dev-files

~~~

### tải chromaDB
1. docker pull chromadb/chroma:latest
2. Tạo nơi lưu dữ liệu ChromaDB: docker volume create chroma_data
3. Chạy ChromaDB: docker run -d --name chromadb --restart unless-stopped -p 8000:8000 -e IS_PERSISTENT=TRUE -e PERSIST_DIRECTORY=/chroma/chroma -v chroma_data:/chroma/chroma chromadb/chroma:latest
4. ChromaDB sẽ chạy tại: http://localhost:8000
~~~

ChromaDB chạy tại http://localhost:8000. Cấu hình local:

~~~dotenv
CHROMA_URL="http://localhost:8000"
CHROMA_TENANT="default_tenant"
CHROMA_DATABASE="default_database"
CHROMA_TOKEN=""
~~~

Trong môi trường local không bật authentication nên để trống CHROMA_TOKEN.

Kiểm tra:

~~~powershell
docker ps --filter "name=chroma"
docker logs chromadb
~~~

### Cài embedding local bằng Ollama
// Tải embedding local để convert từ văn bảng sang vector db
1. Cài ollama cho window: irm https://ollama.com/install.ps1 | iex
2. ollama pull embeddinggemma
3. Kiểm tra: ollama run embeddinggemma "Xin chào"
~~~

Cấu hình embedding local trong server/.env:

~~~dotenv
EMBEDDING_PROVIDER="ollama"
OLLAMA_URL="http://localhost:11434"
EMBEDDING_MODEL="embeddinggemma"
EMBEDDING_API_KEY=""
~~~

Khi dùng Ollama local, không cần EMBEDDING_API_KEY.

### Cấu hình local tối thiểu

~~~dotenv
VITE_API_URL="http://localhost:3101/api"
DATABASE_URL="postgresql://milo:milo_dev_password@localhost:55433/milo?schema=public"
WEB_ORIGIN="http://localhost:5173"
PORT="3101"
REDIS_URL="redis://localhost:56380"

S3_ENDPOINT="http://localhost:59002"
S3_ACCESS_KEY="milo"
S3_SECRET_KEY="milo_dev_password"
S3_BUCKET="milo-documents"

CHROMA_URL="http://localhost:8000"
CHROMA_TENANT="default_tenant"
CHROMA_DATABASE="default_database"
CHROMA_TOKEN=""
KNOWLEDGE_INDEXING_ENABLED="true"

EMBEDDING_PROVIDER="ollama"
OLLAMA_URL="http://localhost:11434"
EMBEDDING_MODEL="embeddinggemma"
EMBEDDING_API_KEY=""
~~~

Các thông tin Facebook App ID, App Secret và Login Configuration ID được cấu hình theo từng workspace trong giao diện tích hợp. Không đặt các giá trị này vào .env dùng chung của toàn hệ thống.

### Luồng upload Knowledge Base

~~~text
Milo upload file
↓
MinIO lưu file gốc
↓
PostgreSQL lưu Document, DocumentVersion và Chunk
↓
Ollama tạo embedding bằng embeddinggemma
↓
ChromaDB lưu vector và metadata
~~~

Metadata vector cần giữ phạm vi workspace và product, ví dụ:

~~~text
workspaceId
productId
documentId
documentVersionId
chunkId
sourceKey
~~~

Nhờ vậy dữ liệu của các công ty/workspace không bị trộn lẫn.

### Luồng phân tích trend và tìm product phù hợp

~~~text
AI tìm keyword trend
↓
Ollama tạo embedding cho từng keyword
↓
Query ChromaDB theo workspace
↓
Lấy các chunk liên quan và productId
↓
AI phân loại FIT / PARTIAL / NOT_FIT / UNKNOWN
↓
Trả product phù hợp cho keyword
~~~

ChromaDB dùng để tìm các đoạn tài liệu gần nghĩa với keyword. Nội dung chi tiết để AI viết bài vẫn lấy từ tài liệu/version đã xác thực trong PostgreSQL để bám sát tài liệu sản phẩm.

### Khởi động toàn bộ môi trường

~~~powershell
docker compose up -d --wait postgres redis minio chroma
npm run db:deploy
npm run db:seed
npm run dev:all
~~~

Các địa chỉ chính:

| Dịch vụ | Địa chỉ |
| --- | --- |
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3101/api |
| MinIO Console theo Compose | http://localhost:59003 |
| ChromaDB | http://localhost:8000 |
| Ollama | http://localhost:11434 |

Lưu ý: npm run db:up hiện chỉ khởi động PostgreSQL, Redis và MinIO. Khi cần ChromaDB, chạy thêm docker compose up -d chroma hoặc dùng lệnh khởi động toàn bộ ở trên.

### Xử lý lỗi thường gặp

Lỗi EADDRINUSE nghĩa là cổng đang bị tiến trình khác sử dụng. Kiểm tra cổng 3101 trên Windows:

~~~powershell
Get-NetTCPConnection -LocalPort 3101 -State Listen |
  Select-Object LocalAddress, LocalPort, OwningProcess
Get-Process -Id <PID>
~~~

Nếu đó là backend cũ, dừng bằng:

~~~powershell
Stop-Process -Id <PID>
~~~

Sau khi sửa schema hoặc migration, generate lại Prisma Client:

~~~powershell
npm run prisma:generate --prefix server
npm run typecheck --prefix server
~~~

### Kiểm tra trước khi commit

Không commit .env, server/.env, node_modules, dist, log hoặc secret thật. Nên commit README.md, .env.example, docker-compose.yml, package manifests, Prisma schema/migrations và source code.

~~~powershell
npm run build
npm run build:api
npm run typecheck --prefix server
git diff --check

git add README.md .env.example docker-compose.yml
git diff --cached --check
git commit -m "docs: document local MinIO ChromaDB and Ollama setup"
~~~

Kiểm tra chắc chắn file môi trường thật chưa được staged:

~~~powershell
git diff --cached -- .env server/.env
~~~

Kết quả mong muốn là không có file môi trường thật được đưa vào commit.

### Bảo mật

- Credentials MinIO trong tài liệu chỉ dành cho local development.
- Không đưa Facebook access token, App Secret, JWT secret hoặc mật khẩu production vào Git.
- Mọi truy vấn PostgreSQL, MinIO và ChromaDB phải lọc theo workspaceId.
- Tài liệu upload cần được giới hạn loại file, dung lượng và kiểm tra an toàn trước khi xử lý.
