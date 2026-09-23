import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common'
import { WorkspaceRole } from '@prisma/client'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { WorkspaceRoles } from '../common/decorators/workspace-roles.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { WorkspaceAccessGuard } from '../common/guards/workspace-access.guard'
import { AuthenticatedUser } from '../common/types/authenticated-user'
import { AI_TOKEN_COSTS } from '../billing/billing.constants'
import { TokenBudgetGuard } from '../billing/token-budget.guard'
import { TokenCost } from '../billing/token-cost.decorator'
import { TokenUsageInterceptor } from '../billing/token-usage.interceptor'
import { CompetitorsService } from './competitors.service'
import { CompetitorDiscoveryService } from './competitor-discovery.service'
import { CompetitorIntelligenceService } from './competitor-intelligence.service'
import { CreateCompetitorDto } from './dto/create-competitor.dto'
import { UpdateCompetitorDto } from './dto/update-competitor.dto'

@Controller('workspaces/:workspaceId/competitors')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, TokenBudgetGuard)
@UseInterceptors(TokenUsageInterceptor)
@WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
export class CompetitorsController {
  constructor(
    private readonly competitors: CompetitorsService,
    private readonly discovery: CompetitorDiscoveryService,
    private readonly intelligence: CompetitorIntelligenceService,
  ) {}

  @Get()
  list(@Param('workspaceId') workspaceId: string) {
    return this.competitors.list(workspaceId)
  }

  @Post()
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCompetitorDto,
  ) {
    return this.competitors.create(workspaceId, user.id, dto)
  }

  @Post('discover')
  @TokenCost(AI_TOKEN_COSTS.COMPETITOR_DISCOVERY, 'competitor-discovery')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  discover(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.discovery.discover(workspaceId, user.id)
  }

  @Get('intelligence')
  intelligenceOverview(@Param('workspaceId') workspaceId: string) {
    return this.intelligence.get(workspaceId)
  }

  @Post('intelligence/analyze')
  @TokenCost(AI_TOKEN_COSTS.COMPETITOR_INTELLIGENCE, 'competitor-intelligence')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  analyzeIntelligence(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.intelligence.analyze(workspaceId, user.id)
  }

  @Get(':competitorId')
  get(@Param('workspaceId') workspaceId: string, @Param('competitorId') competitorId: string) {
    return this.competitors.get(workspaceId, competitorId)
  }

  @Patch(':competitorId')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('competitorId') competitorId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCompetitorDto,
  ) {
    return this.competitors.update(workspaceId, competitorId, user.id, dto)
  }

  @Delete(':competitorId')
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  deactivate(
    @Param('workspaceId') workspaceId: string,
    @Param('competitorId') competitorId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.competitors.deactivate(workspaceId, competitorId, user.id)
  }
}
