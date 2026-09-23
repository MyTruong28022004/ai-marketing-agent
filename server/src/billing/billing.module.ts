import { Global, Module } from '@nestjs/common'
import { WorkspaceAccessGuard } from '../common/guards/workspace-access.guard'
import { BillingController } from './billing.controller'
import { BillingService } from './billing.service'
import { TokenBudgetGuard } from './token-budget.guard'
import { TokenUsageInterceptor } from './token-usage.interceptor'

@Global()
@Module({
  controllers: [BillingController],
  providers: [BillingService, TokenBudgetGuard, TokenUsageInterceptor, WorkspaceAccessGuard],
  exports: [BillingService, TokenBudgetGuard, TokenUsageInterceptor],
})
export class BillingModule {}
