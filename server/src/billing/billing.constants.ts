import { ServicePlan } from '@prisma/client'

export const PLAN_CATALOG = {
  [ServicePlan.FREE]: {
    code: ServicePlan.FREE,
    name: 'Free',
    monthlyPrice: 0,
    includedTokens: 25_000,
    seats: 2,
    description: 'Dành cho workspace mới bắt đầu thử nghiệm Milo.',
    features: ['25.000 token mỗi tháng', '2 thành viên', 'Dashboard cơ bản'],
  },
  [ServicePlan.BASIC]: {
    code: ServicePlan.BASIC,
    name: 'Basic',
    monthlyPrice: 499_000,
    includedTokens: 250_000,
    seats: 10,
    description: 'Gói khuyến nghị cho đội ngũ marketing và sales đang tăng trưởng.',
    features: ['250.000 token mỗi tháng', '10 thành viên', 'Báo cáo chi tiết', 'Mua thêm token'],
    recommended: true,
  },
  [ServicePlan.PREMIUM]: {
    code: ServicePlan.PREMIUM,
    name: 'Premium',
    monthlyPrice: 1_499_000,
    includedTokens: 1_000_000,
    seats: 50,
    description: 'Cho tổ chức vận hành AI ở quy mô lớn và cần kiểm soát nâng cao.',
    features: ['1.000.000 token mỗi tháng', '50 thành viên', 'Ưu tiên tác vụ AI', 'Quản trị nâng cao'],
  },
} as const

export const TOKEN_ADD_ONS = [
  { code: 'TOKENS_100K', name: '100K token', tokens: 100_000, price: 249_000 },
  { code: 'TOKENS_500K', name: '500K token', tokens: 500_000, price: 999_000, recommended: true },
  { code: 'TOKENS_1M', name: '1M token', tokens: 1_000_000, price: 1_749_000 },
] as const

export const AI_TOKEN_COSTS = {
  WEBSITE_ANALYSIS: 5_000,
  COMPETITOR_DISCOVERY: 8_000,
  COMPETITOR_INTELLIGENCE: 7_000,
  VIDEO_SCRIPT: 2_500,
  VIDEO_PROJECT: 12_000,
  VIDEO_REGENERATE_ASSETS: 8_000,
  CUSTOM_VOICE: 5_000,
} as const
