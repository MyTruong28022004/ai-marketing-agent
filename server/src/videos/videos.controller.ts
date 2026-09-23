import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common'
import { WorkspaceRole } from '@prisma/client'
import { FastifyRequest } from 'fastify'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { WorkspaceRoles } from '../common/decorators/workspace-roles.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { WorkspaceAccessGuard } from '../common/guards/workspace-access.guard'
import { AuthenticatedUser } from '../common/types/authenticated-user'
import { AI_TOKEN_COSTS } from '../billing/billing.constants'
import { TokenBudgetGuard } from '../billing/token-budget.guard'
import { TokenCost } from '../billing/token-cost.decorator'
import { TokenUsageInterceptor } from '../billing/token-usage.interceptor'
import { CreateVideoProjectDto } from './dto/create-video-project.dto'
import { GenerateVideoScriptDto } from './dto/generate-video-script.dto'
import { ReorderVideoScenesDto } from './dto/reorder-video-scenes.dto'
import { UpdateVideoProjectDto } from './dto/update-video-project.dto'
import { UpdateVideoSceneDto } from './dto/update-video-scene.dto'
import { VideosService } from './videos.service'

@Controller('workspaces/:workspaceId/videos')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, TokenBudgetGuard)
@UseInterceptors(TokenUsageInterceptor)
@WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
export class VideosController {
  constructor(private readonly videos: VideosService) {}

  @Get('configuration')
  configuration() { return this.videos.configuration() }

  @Get('voices')
  voices(@Param('workspaceId') workspaceId: string) { return this.videos.voices(workspaceId) }

  @Post('script')
  @TokenCost(AI_TOKEN_COSTS.VIDEO_SCRIPT, 'video-script')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  generateScript(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateVideoScriptDto,
  ) { return this.videos.generateScript(workspaceId, user.id, dto) }

  @Post('voices')
  @TokenCost(AI_TOKEN_COSTS.CUSTOM_VOICE, 'custom-voice')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  async createVoice(@Param('workspaceId') workspaceId: string, @CurrentUser() user: AuthenticatedUser, @Req() request: FastifyRequest) {
    const input: { name?: string; language?: string; consent?: { buffer: Buffer; mimeType: string; filename: string }; sample?: { buffer: Buffer; mimeType: string; filename: string } } = {}
    for await (const part of request.parts()) {
      if (part.type === 'file') {
        const upload = { buffer: await part.toBuffer(), mimeType: part.mimetype, filename: part.filename }
        if (part.fieldname === 'consent') input.consent = upload
        if (part.fieldname === 'sample') input.sample = upload
      } else if (part.fieldname === 'name') input.name = String(part.value)
      else if (part.fieldname === 'language') input.language = String(part.value)
    }
    if (!input.name?.trim() || !input.consent || !input.sample) throw new BadRequestException('Cần tên voice, consent recording và voice sample.')
    return this.videos.createVoice(workspaceId, user.id, { name: input.name.trim(), language: input.language || 'vi', consent: input.consent, sample: input.sample })
  }

  @Get()
  list(@Param('workspaceId') workspaceId: string) { return this.videos.list(workspaceId) }

  @Post()
  @TokenCost(AI_TOKEN_COSTS.VIDEO_PROJECT, 'video-project')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  create(@Param('workspaceId') workspaceId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateVideoProjectDto) {
    return this.videos.create(workspaceId, user.id, dto)
  }

  @Get(':projectId')
  get(@Param('workspaceId') workspaceId: string, @Param('projectId') projectId: string) { return this.videos.get(workspaceId, projectId) }

  @Post(':projectId/generate-assets')
  @TokenCost(AI_TOKEN_COSTS.VIDEO_REGENERATE_ASSETS, 'video-assets')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  generateAssets(@Param('workspaceId') workspaceId: string, @Param('projectId') projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.videos.regenerateAssets(workspaceId, projectId, user.id)
  }

  @Patch(':projectId/settings')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  updateSettings(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateVideoProjectDto,
  ) { return this.videos.updateSettings(workspaceId, projectId, user.id, dto) }

  @Post(':projectId/generate-images')
  @TokenCost(AI_TOKEN_COSTS.VIDEO_REGENERATE_ASSETS, 'video-images')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  generateImages(@Param('workspaceId') workspaceId: string, @Param('projectId') projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.videos.generateImages(workspaceId, projectId, user.id)
  }

  @Post(':projectId/generate-audio')
  @TokenCost(AI_TOKEN_COSTS.VIDEO_REGENERATE_ASSETS, 'video-audio')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  generateAudio(@Param('workspaceId') workspaceId: string, @Param('projectId') projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.videos.generateAudio(workspaceId, projectId, user.id)
  }

  @Post(':projectId/render')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  render(@Param('workspaceId') workspaceId: string, @Param('projectId') projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.videos.render(workspaceId, projectId, user.id)
  }

  @Patch(':projectId/scenes/:sceneId')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  updateScene(
    @Param('workspaceId') workspaceId: string, @Param('projectId') projectId: string, @Param('sceneId') sceneId: string,
    @CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateVideoSceneDto,
  ) { return this.videos.updateScene(workspaceId, projectId, sceneId, user.id, dto) }

  @Post(':projectId/scenes')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  addScene(@Param('workspaceId') workspaceId: string, @Param('projectId') projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.videos.addScene(workspaceId, projectId, user.id)
  }

  @Delete(':projectId/scenes/:sceneId')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  deleteScene(
    @Param('workspaceId') workspaceId: string, @Param('projectId') projectId: string, @Param('sceneId') sceneId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) { return this.videos.deleteScene(workspaceId, projectId, sceneId, user.id) }

  @Post(':projectId/scenes/reorder')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  reorder(
    @Param('workspaceId') workspaceId: string, @Param('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser, @Body() dto: ReorderVideoScenesDto,
  ) { return this.videos.reorderScenes(workspaceId, projectId, user.id, dto.sceneIds) }

  @Post(':projectId/scenes/:sceneId/asset')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  async uploadAsset(
    @Param('workspaceId') workspaceId: string, @Param('projectId') projectId: string, @Param('sceneId') sceneId: string,
    @CurrentUser() user: AuthenticatedUser, @Req() request: FastifyRequest,
  ) {
    const file = await request.file()
    if (!file) throw new BadRequestException('Chưa chọn file ảnh hoặc video.')
    return this.videos.uploadSceneAsset(workspaceId, projectId, sceneId, user.id, { buffer: await file.toBuffer(), mimeType: file.mimetype, filename: file.filename })
  }

  @Post(':projectId/scenes/:sceneId/generate-image')
  @TokenCost(AI_TOKEN_COSTS.VIDEO_REGENERATE_ASSETS, 'video-scene-image')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  regenerateSceneImage(
    @Param('workspaceId') workspaceId: string, @Param('projectId') projectId: string, @Param('sceneId') sceneId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) { return this.videos.regenerateSceneImage(workspaceId, projectId, sceneId, user.id) }

  @Post(':projectId/scenes/:sceneId/generate-audio')
  @TokenCost(AI_TOKEN_COSTS.VIDEO_REGENERATE_ASSETS, 'video-scene-audio')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  regenerateSceneAudio(
    @Param('workspaceId') workspaceId: string, @Param('projectId') projectId: string, @Param('sceneId') sceneId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) { return this.videos.regenerateSceneAudio(workspaceId, projectId, sceneId, user.id) }

  @Post(':projectId/music')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  async uploadMusic(
    @Param('workspaceId') workspaceId: string, @Param('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser, @Req() request: FastifyRequest,
  ) {
    const file = await request.file()
    if (!file) throw new BadRequestException('Chưa chọn file nhạc nền.')
    return this.videos.uploadMusic(workspaceId, projectId, user.id, { buffer: await file.toBuffer(), mimeType: file.mimetype, filename: file.filename })
  }

  @Delete(':projectId')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  delete(@Param('workspaceId') workspaceId: string, @Param('projectId') projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.videos.delete(workspaceId, projectId, user.id)
  }
}
