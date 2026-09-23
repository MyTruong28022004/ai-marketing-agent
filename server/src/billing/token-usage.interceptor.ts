import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { mergeMap, Observable } from 'rxjs'
import { AuthenticatedUser } from '../common/types/authenticated-user'
import { BillingService } from './billing.service'
import { TOKEN_COST_KEY, TokenCostMetadata } from './token-cost.decorator'

@Injectable()
export class TokenUsageInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector, private readonly billing: BillingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const cost = this.reflector.getAllAndOverride<TokenCostMetadata>(TOKEN_COST_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!cost) return next.handle()
    const request = context.switchToHttp().getRequest<{ user: AuthenticatedUser; params: Record<string, string> }>()
    return next.handle().pipe(mergeMap(async result => {
      await this.billing.consume(request.params.workspaceId, request.user.id, cost.feature, cost.amount)
      return result
    }))
  }
}
