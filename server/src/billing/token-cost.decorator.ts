import { SetMetadata } from '@nestjs/common'

export const TOKEN_COST_KEY = 'token_cost'
export type TokenCostMetadata = { amount: number; feature: string }
export const TokenCost = (amount: number, feature: string) => SetMetadata(TOKEN_COST_KEY, { amount, feature } satisfies TokenCostMetadata)
