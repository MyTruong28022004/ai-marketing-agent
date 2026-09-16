import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
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

  @Get(':workspaceId/onboarding')
  @UseGuards(WorkspaceAccessGuard)
  getOnboarding(@Param('workspaceId') workspaceId: string) {
    return this.workspaces.getOnboarding(workspaceId)
  }

  @Post(':workspaceId/onboarding/analyze-website')
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  @UseGuards(WorkspaceAccessGuard)
  analyzeWebsite(
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
