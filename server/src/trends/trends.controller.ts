import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { WorkspaceRole } from '@prisma/client'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { WorkspaceRoles } from '../common/decorators/workspace-roles.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { WorkspaceAccessGuard } from '../common/guards/workspace-access.guard'
import { AuthenticatedUser } from '../common/types/authenticated-user'
import { CreateKeywordFolderDto } from './dto/create-keyword-folder.dto'
import { ContentPlanReviewDto } from './dto/content-plan-review.dto'
import { ContentCalendarQueryDto } from './dto/content-calendar-query.dto'
import { GeneratePostContentDto } from './dto/generate-post-content.dto'
import { GenerateContentPlanDto } from './dto/generate-content-plan.dto'
import { ReturnContentPlanDto } from './dto/return-content-plan.dto'
import { SearchTrendsDto } from './dto/search-trends.dto'
import { SaveContentPlanDto } from './dto/save-content-plan.dto'
import { SaveTrendKeywordDto } from './dto/save-trend-keyword.dto'
import { UpdateContentPostStatusDto } from './dto/update-content-post-status.dto'
import { UpdateContentPostReviewDto } from './dto/update-content-post-review.dto'
import { PublishFacebookPostDto } from './dto/publish-facebook-post.dto'
import { TrendsService } from './trends.service'

@Controller('workspaces/:workspaceId/trends')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class TrendsController {
  constructor(private readonly trends: TrendsService) {}

  @Get('topics')
  listTopics() {
    return this.trends.listTopics()
  }

  @Get('folders')
  listFolders(@Param('workspaceId') workspaceId: string) {
    return this.trends.listFolders(workspaceId)
  }

  @Get('saved')
  listSavedKeywords(@Param('workspaceId') workspaceId: string) {
    return this.trends.listSavedKeywords(workspaceId)
  }

  @Delete('folders/:folderId/items/:keywordId')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  deleteSavedKeyword(
    @Param('workspaceId') workspaceId: string,
    @Param('folderId') folderId: string,
    @Param('keywordId') keywordId: string,
  ) {
    return this.trends.deleteSavedKeyword(workspaceId, folderId, keywordId)
  }

  @Post('folders')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  createFolder(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateKeywordFolderDto,
  ) {
    return this.trends.createFolder(workspaceId, user.id, dto)
  }

  @Post('search')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  search(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SearchTrendsDto,
  ) {
    return this.trends.search(workspaceId, user.id, dto)
  }

  @Post('content-plan')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  generateContentPlan(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateContentPlanDto,
  ) {
    return this.trends.generateContentPlan(workspaceId, user.id, dto)
  }

  @Post('content-plan/save')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  saveContentPlan(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveContentPlanDto,
  ) {
    return this.trends.saveContentPlan(workspaceId, user.id, dto)
  }

  @Get('content-plans')
  listContentPlans(@Param('workspaceId') workspaceId: string) {
    return this.trends.listContentPlans(workspaceId)
  }

  @Post('content-plans/:planId/submit')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  submitContentPlan(
    @Param('workspaceId') workspaceId: string,
    @Param('planId') planId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ContentPlanReviewDto,
  ) {
    return this.trends.submitContentPlan(workspaceId, user.id, planId, dto)
  }

  @Post('content-plans/:planId/approve')
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  approveContentPlan(
    @Param('workspaceId') workspaceId: string,
    @Param('planId') planId: string,
    @Body() dto: ContentPlanReviewDto,
  ) {
    return this.trends.approveContentPlan(workspaceId, planId, dto)
  }

  @Post('content-plans/:planId/return')
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  returnContentPlan(
    @Param('workspaceId') workspaceId: string,
    @Param('planId') planId: string,
    @Body() dto: ReturnContentPlanDto,
  ) {
    return this.trends.returnContentPlan(workspaceId, planId, dto)
  }

  @Post('content-plans/:planId/generate-content')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  generatePostContent(
    @Param('workspaceId') workspaceId: string,
    @Param('planId') planId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GeneratePostContentDto,
  ) {
    return this.trends.generatePostContent(workspaceId, user.id, planId, dto)
  }

  @Post('content-posts/:postId/publish-facebook')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  publishContentPostToFacebook(
    @Param('workspaceId') workspaceId: string,
    @Param('postId') postId: string,
    @Body() dto: PublishFacebookPostDto,
  ) {
    return this.trends.publishContentPostToFacebook(workspaceId, postId, dto.integrationId)
  }

  @Get('content-calendar')
  listContentCalendar(
    @Param('workspaceId') workspaceId: string,
    @Query() query: ContentCalendarQueryDto,
  ) {
    return this.trends.listContentCalendar(workspaceId, query)
  }

  @Patch('content-posts/:postId/status')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  updateContentPostStatus(
    @Param('workspaceId') workspaceId: string,
    @Param('postId') postId: string,
    @Body() dto: UpdateContentPostStatusDto,
  ) {
    return this.trends.updateContentPostStatus(workspaceId, postId, dto)
  }

  @Patch('content-posts/:postId')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  updateContentPostReview(
    @Param('workspaceId') workspaceId: string,
    @Param('postId') postId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateContentPostReviewDto,
  ) {
    return this.trends.updateContentPostReview(workspaceId, user.id, postId, dto)
  }

  @Post('save')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  saveKeyword(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveTrendKeywordDto,
  ) {
    return this.trends.saveKeyword(workspaceId, user.id, dto)
  }
}
