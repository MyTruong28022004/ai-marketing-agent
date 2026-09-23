import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthenticatedUser } from '../common/types/authenticated-user'
import { BillingService } from './billing.service'
import { TOKEN_COST_KEY, TokenCostMetadata } from './token-cost.decorator'

@Injectable()
export class TokenBudgetGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly billing: BillingService) {}

  async canActivate(context: ExecutionContext) {
    const cost = this.reflector.getAllAndOverride<TokenCostMetadata>(TOKEN_COST_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!cost) return true
    const request = context.switchToHttp().getRequest<{ user: AuthenticatedUser; params: Record<string, string> }>()
    await this.billing.assertAvailable(request.params.workspaceId, cost.amount)
    return true
  }
}
