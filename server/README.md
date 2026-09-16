# Milo API

Backend NestJS cho Milo, được tổ chức theo mô hình multi-tenant. Mỗi request nghiệp vụ phải đi qua `workspaceId`, membership guard và role guard.

## Chạy local

Từ thư mục gốc project:

```powershell
Copy-Item .env.example server/.env
npm run db:up
npm run db:deploy
npm run db:seed
npm run dev:api
```

Docker Desktop phải đang chạy. Nếu dùng PostgreSQL cài trực tiếp, cập nhật `DATABASE_URL` trong `server/.env` rồi bỏ qua `db:up`.

## AI phân tích website khi onboarding

Mặc định backend dùng phiên đăng nhập Codex/ChatGPT trên máy local, không cần thêm OpenAI API key. Đăng nhập một lần và kiểm tra trạng thái:

```powershell
codex login
codex login status
```

Giữ cấu hình sau trong `server/.env`, sau đó khởi động lại backend:

```env
AI_PROVIDER="codex-local"
CODEX_MODEL=""
```

Tại bước Doanh nghiệp, nhập website và bấm **Tự động điền**. Backend dùng Codex SDK với quyền chỉ đọc và web search để trả về dữ liệu có cấu trúc; người dùng vẫn duyệt và lưu từng bước.

Các tác vụ marketing của Codex dùng bộ skill được cài tại `.agents/skills`. `AGENTS.md` ở thư mục gốc định tuyến tác vụ đến skill phù hợp và yêu cầu mọi luồng backend tự động không ghi dữ liệu tenant ra filesystem. Cập nhật bộ skill từ nguồn `coreyhaines31/marketingskills` bằng skill installer trước khi nâng phiên bản.

Chế độ này dành cho ứng dụng chạy local hoặc môi trường riêng vì backend dùng thông tin đăng nhập Codex của người vận hành. Nếu triển khai dịch vụ công khai cho nhiều người dùng, chuyển sang OpenAI API:

```env
AI_PROVIDER="openai"
OPENAI_API_KEY="your-server-side-api-key"
OPENAI_MODEL="gpt-5-mini"
```

API key chỉ được cấu hình ở backend, không đặt trong biến bắt đầu bằng `VITE_`.

## Authentication

- Access token được trả về response và gửi bằng `Authorization: Bearer <token>`.
- Refresh token được rotate và lưu trong cookie `HttpOnly` giới hạn ở `/api/auth`.
- Backend chỉ lưu hash của refresh token.
- Khi logout, session bị revoke và cookie bị xóa.

## Endpoint hiện có

| Method | Endpoint | Quyền |
| --- | --- | --- |
| GET | `/api/health` | Public |
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/refresh` | Refresh cookie |
| POST | `/api/auth/logout` | Refresh cookie |
| GET | `/api/workspaces` | Authenticated |
| POST | `/api/workspaces` | Authenticated |
| GET | `/api/workspaces/:workspaceId` | Member |
| GET | `/api/workspaces/:workspaceId/members` | Member |
| POST | `/api/workspaces/:workspaceId/invitations` | Admin |
| POST | `/api/workspaces/invitations/:token/accept` | Authenticated invitee |
| GET | `/api/workspaces/:workspaceId/onboarding` | Member |
| POST | `/api/workspaces/:workspaceId/onboarding/analyze-website` | Admin |
| PATCH | `/api/workspaces/:workspaceId/onboarding` | Admin |
| GET | `/api/workspaces/:workspaceId/competitors` | Member |
| POST | `/api/workspaces/:workspaceId/competitors` | Marketer, Admin |
| POST | `/api/workspaces/:workspaceId/competitors/discover` | Marketer, Admin; Codex tìm và lưu top 10 |
| PATCH | `/api/workspaces/:workspaceId/competitors/:competitorId` | Marketer, Admin |
| DELETE | `/api/workspaces/:workspaceId/competitors/:competitorId` | Admin, soft delete |

Invitation API hiện trả token một lần cho admin để hỗ trợ local development. Module email sẽ thay bước này bằng việc gửi link mời.

## Onboarding payload mẫu

```json
{
  "legalName": "Atelier No.8",
  "website": "https://example.com",
  "country": "VN",
  "timezone": "Asia/Ho_Chi_Minh",
  "language": "vi",
  "industry": "Fashion",
  "subIndustries": ["Linen", "Accessories"],
  "businessModel": "B2C",
  "description": "Thời trang linen cho khách hàng thành thị",
  "products": { "groups": ["Váy", "Áo", "Phụ kiện"] },
  "audiences": { "primary": "Nữ 25-40 tại thành phố" },
  "goals": ["Traffic", "Leads", "Revenue"],
  "brandVoice": { "tone": ["Tinh tế", "Gần gũi"] },
  "currentStep": "COMPETITORS"
}
```

## Nguyên tắc dữ liệu

- Không tin `workspaceId` từ client nếu chưa kiểm tra membership.
- Role thuộc membership, không thuộc user toàn cục.
- Không hard-delete đối thủ trong API; dùng `active=false` để bảo toàn lịch sử.
- Token của Facebook/Google sau này phải mã hóa trước khi ghi vào các trường `encrypted*Token`.
- Mọi hành động quản trị và thay đổi onboarding đều ghi `AuditLog`.
