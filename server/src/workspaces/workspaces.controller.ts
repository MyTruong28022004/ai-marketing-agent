import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common'
import { WorkspaceRole } from '@prisma/client'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { WorkspaceRoles } from '../common/decorators/workspace-roles.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { WorkspaceAccessGuard } from '../common/guards/workspace-access.guard'
import { AuthenticatedUser } from '../common/types/authenticated-user'
import { CreateWorkspaceDto } from './dto/create-workspace.dto'
import { AnalyzeWebsiteDto } from './dto/analyze-website.dto'
import { InviteMemberDto } from './dto/invite-member.dto'
import { UpdateOnboardingDto } from './dto/update-onboarding.dto'
import { UpdateMemberRoleDto } from './dto/update-member-role.dto'
import { AI_TOKEN_COSTS } from '../billing/billing.constants'
import { TokenBudgetGuard } from '../billing/token-budget.guard'
import { TokenCost } from '../billing/token-cost.decorator'
import { TokenUsageInterceptor } from '../billing/token-usage.interceptor'
import { WebsiteAnalysisService } from './website-analysis.service'
import { WorkspacesService } from './workspaces.service'

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(
    private readonly workspaces: WorkspacesService,
    private readonly websiteAnalysis: WebsiteAnalysisService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.workspaces.listForUser(user.id)
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWorkspaceDto) {
    return this.workspaces.create(user, dto)
  }

  @Post('invitations/:token/accept')
  acceptInvitation(@Param('token') token: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workspaces.acceptInvitation(token, user)
  }

  @Get(':workspaceId')
  @UseGuards(WorkspaceAccessGuard)
  getOverview(@Param('workspaceId') workspaceId: string) {
    return this.workspaces.getOverview(workspaceId)
  }

  @Get(':workspaceId/members')
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  @UseGuards(WorkspaceAccessGuard)
  getMembers(@Param('workspaceId') workspaceId: string) {
    return this.workspaces.getMembers(workspaceId)
  }

  @Post(':workspaceId/invitations')
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  @UseGuards(WorkspaceAccessGuard)
  invite(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteMemberDto,
  ) {
    return this.workspaces.invite(workspaceId, user.id, dto)
  }

  @Patch(':workspaceId/members/:membershipId')
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  @UseGuards(WorkspaceAccessGuard)
  updateMemberRole(
    @Param('workspaceId') workspaceId: string,
    @Param('membershipId') membershipId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.workspaces.updateMemberRole(workspaceId, membershipId, user.id, dto.role)
  }

  @Delete(':workspaceId/members/:membershipId')
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  @UseGuards(WorkspaceAccessGuard)
  @HttpCode(204)
  removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('membershipId') membershipId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workspaces.removeMember(workspaceId, membershipId, user.id)
  }

  @Get(':workspaceId/onboarding')
  @UseGuards(WorkspaceAccessGuard)
  getOnboarding(@Param('workspaceId') workspaceId: string) {
    return this.workspaces.getOnboarding(workspaceId)
  }

  @Post(':workspaceId/onboarding/analyze-website')
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  @UseGuards(WorkspaceAccessGuard, TokenBudgetGuard)
  @UseInterceptors(TokenUsageInterceptor)
  @TokenCost(AI_TOKEN_COSTS.WEBSITE_ANALYSIS, 'website-analysis')
  analyzeWebsite(
    @Param('workspaceId') _workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AnalyzeWebsiteDto,
  ) {
    return this.websiteAnalysis.analyze(dto.website, user.id)
  }

  @Patch(':workspaceId/onboarding')
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  @UseGuards(WorkspaceAccessGuard)
  updateOnboarding(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOnboardingDto,
  ) {
    return this.workspaces.updateOnboarding(workspaceId, user.id, dto)
  }
}
