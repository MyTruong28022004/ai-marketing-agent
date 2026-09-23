import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { WorkspaceRole } from '@prisma/client'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { WorkspaceRoles } from '../common/decorators/workspace-roles.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { WorkspaceAccessGuard } from '../common/guards/workspace-access.guard'
import { AuthenticatedUser } from '../common/types/authenticated-user'
import { BillingService } from './billing.service'
import { BuyTokenPackageDto } from './dto/buy-token-package.dto'
import { ChangePlanDto } from './dto/change-plan.dto'

@Controller('workspaces/:workspaceId/billing')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
@WorkspaceRoles(WorkspaceRole.ADMIN)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('catalog')
  catalog() { return this.billing.catalog() }

  @Get('summary')
  summary(@Param('workspaceId') workspaceId: string) { return this.billing.summary(workspaceId) }

  @Get('transactions')
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  transactions(@Param('workspaceId') workspaceId: string) { return this.billing.transactions(workspaceId) }

  @Post('plan')
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  changePlan(@Param('workspaceId') workspaceId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePlanDto) {
    return this.billing.changePlan(workspaceId, user.id, dto.plan)
  }

  @Post('tokens')
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  buyTokens(@Param('workspaceId') workspaceId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: BuyTokenPackageDto) {
    return this.billing.buyTokens(workspaceId, user.id, dto.packageCode)
  }
}
