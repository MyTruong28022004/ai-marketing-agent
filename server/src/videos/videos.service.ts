import { BadGatewayException, BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { Prisma, VideoAssetType, VideoProjectStatus, VoiceProfileStatus } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { PrismaService } from '../prisma/prisma.service'
import { CreateVideoProjectDto } from './dto/create-video-project.dto'
import { GenerateVideoScriptDto } from './dto/generate-video-script.dto'
import { UpdateVideoSceneDto } from './dto/update-video-scene.dto'
import { UpdateVideoProjectDto } from './dto/update-video-project.dto'
import { VideoAiService } from './video-ai.service'
import { VideoRendererService } from './video-renderer.service'
import { VideoStorageService } from './video-storage.service'

type Upload = { buffer: Buffer; mimeType: string; filename: string }
type GenerationProject = Prisma.VideoProjectGetPayload<{ include: { scenes: true; voiceProfile: true } }>
type GenerationScene = GenerationProject['scenes'][number]

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: VideoAiService,
    private readonly renderer: VideoRendererService,
    private readonly storage: VideoStorageService,
  ) {}

  configuration() {
    return {
      ...this.ai.mediaConfiguration(),
      builtInVoices: [
        { id: 'marin', name: 'Mai', description: 'Ấm áp, tự nhiên' },
        { id: 'coral', name: 'An', description: 'Tươi sáng, năng động' },
        { id: 'cedar', name: 'Minh', description: 'Trầm, truyền cảm' },
        { id: 'sage', name: 'Linh', description: 'Điềm tĩnh, chuyên nghiệp' },
      ],
      styles: [
        { id: 'editorial', name: 'Editorial', description: 'Tinh tế, thời trang, nhiều khoảng thở' },
        { id: 'cinematic', name: 'Cinematic', description: 'Điện ảnh, giàu chiều sâu và chuyển động' },
        { id: 'product', name: 'Product focus', description: 'Tập trung sản phẩm và chi tiết sử dụng' },
        { id: 'ugc', name: 'UGC tự nhiên', description: 'Gần gũi như nội dung quay bằng điện thoại' },
        { id: 'minimal', name: 'Minimal', description: 'Tối giản, sạch và hiện đại' },
      ],
    }
  }

  async generateScript(workspaceId: string, actorId: string, dto: GenerateVideoScriptDto) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true, companyProfile: true },
    })
    if (!workspace) throw new NotFoundException('Không tìm thấy workspace.')
    return this.ai.generateScript(dto, workspace, actorId)
  }

  async list(workspaceId: string) {
    const projects = await this.prisma.videoProject.findMany({
      where: { workspaceId }, include: { scenes: { orderBy: { position: 'asc' }, take: 1 }, voiceProfile: { select: { id: true, name: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return Promise.all(projects.map(project => this.presentProject(project, false)))
  }

  async get(workspaceId: string, projectId: string) {
    const project = await this.findProject(workspaceId, projectId)
    return this.presentProject(project, true)
  }

  async create(workspaceId: string, actorId: string, dto: CreateVideoProjectDto) {
    if (dto.voiceProfileId) await this.assertVoice(workspaceId, dto.voiceProfileId)
    const settings = {
      tone: dto.tone, visualStyle: dto.visualStyle, pace: dto.pace, hookStyle: dto.hookStyle,
      audience: dto.audience || '', callToAction: dto.callToAction || '', voiceId: dto.voiceId || 'marin',
      voiceInstructions: dto.voiceInstructions || '', sceneCount: dto.sceneCount || 5, captions: dto.captions !== false,
      imageQuality: 'medium', captionStyle: 'bold-bottom', creativeDirection: '',
    }
    const project = await this.prisma.videoProject.create({
      data: {
        workspaceId, createdById: actorId, voiceProfileId: dto.voiceProfileId, title: dto.title.trim(), script: dto.script.trim(),
        channel: dto.channel?.trim(), ratio: dto.ratio, status: VideoProjectStatus.PLANNING, settings: settings as Prisma.InputJsonValue,
      },
    })
    await this.audit(workspaceId, actorId, 'video.project_created', project.id, { ratio: dto.ratio, channel: dto.channel })
    void this.planAndGenerate(project.id, dto, actorId)
    return this.presentProject({ ...project, scenes: [], voiceProfile: null }, true)
  }

  async regenerateAssets(workspaceId: string, projectId: string, actorId: string) {
    const project = await this.findProject(workspaceId, projectId)
    if (!project.scenes.length) throw new BadRequestException('Storyboard chưa có phân cảnh.')
    await this.prisma.videoProject.update({ where: { id: projectId }, data: { status: VideoProjectStatus.GENERATING_ASSETS, errorMessage: null } })
    void this.generateAssets(projectId, actorId)
    return { id: projectId, status: VideoProjectStatus.GENERATING_ASSETS }
  }

  async updateSettings(workspaceId: string, projectId: string, actorId: string, dto: UpdateVideoProjectDto) {
    const project = await this.findProject(workspaceId, projectId)
    if (dto.voiceProfileId) await this.assertVoice(workspaceId, dto.voiceProfileId)
    const updates = Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined && value !== null && value !== ''))
    delete updates.voiceProfileId
    const settings = { ...(project.settings as Record<string, unknown>), ...updates }
    await this.prisma.videoProject.update({
      where: { id: projectId },
      data: {
        settings: settings as Prisma.InputJsonValue,
        ...(dto.voiceProfileId !== undefined ? { voiceProfileId: dto.voiceProfileId } : {}),
        status: VideoProjectStatus.READY_TO_EDIT,
        outputStorageKey: null,
        thumbnailStorageKey: null,
        errorMessage: null,
      },
    })
    await this.audit(workspaceId, actorId, 'video.settings_updated', projectId, updates)
    return this.get(workspaceId, projectId)
  }

  async generateImages(workspaceId: string, projectId: string, actorId: string) {
    const project = await this.findProject(workspaceId, projectId)
    if (!project.scenes.length) throw new BadRequestException('Storyboard chưa có phân cảnh.')
    if (!this.ai.mediaConfiguration().configured) throw new ServiceUnavailableException('Cần OPENAI_API_KEY để tạo hình ảnh.')
    await this.prisma.videoProject.update({ where: { id: projectId }, data: { status: VideoProjectStatus.GENERATING_ASSETS, errorMessage: null } })
    void this.generateImagesOnly(projectId, actorId)
    return { id: projectId, status: VideoProjectStatus.GENERATING_ASSETS }
  }

  async generateAudio(workspaceId: string, projectId: string, actorId: string) {
    const project = await this.findProject(workspaceId, projectId)
    if (!project.scenes.length) throw new BadRequestException('Storyboard chưa có phân cảnh.')
    if (!this.ai.mediaConfiguration().configured) throw new ServiceUnavailableException('Cần OPENAI_API_KEY để tạo giọng đọc.')
    await this.prisma.videoProject.update({ where: { id: projectId }, data: { status: VideoProjectStatus.GENERATING_ASSETS, errorMessage: null } })
    void this.generateAudioOnly(projectId, actorId)
    return { id: projectId, status: VideoProjectStatus.GENERATING_ASSETS }
  }

  async regenerateSceneImage(workspaceId: string, projectId: string, sceneId: string, actorId: string) {
    const project = await this.findGenerationProject(workspaceId, projectId)
    const scene = project.scenes.find(item => item.id === sceneId)
    if (!scene) throw new NotFoundException('Không tìm thấy phân cảnh.')
    if (!this.ai.mediaConfiguration().configured) throw new ServiceUnavailableException('Cần OPENAI_API_KEY để tạo hình ảnh.')
    await this.generateSceneImageAsset(project, scene)
    await this.invalidateRender(projectId)
    await this.audit(workspaceId, actorId, 'video.scene_image_generated', sceneId, {})
    return this.get(workspaceId, projectId)
  }

  async regenerateSceneAudio(workspaceId: string, projectId: string, sceneId: string, actorId: string) {
    const project = await this.findGenerationProject(workspaceId, projectId)
    const scene = project.scenes.find(item => item.id === sceneId)
    if (!scene) throw new NotFoundException('Không tìm thấy phân cảnh.')
    if (!this.ai.mediaConfiguration().configured) throw new ServiceUnavailableException('Cần OPENAI_API_KEY để tạo giọng đọc.')
    await this.generateSceneAudioAsset(project, scene)
    await this.invalidateRender(projectId)
    await this.audit(workspaceId, actorId, 'video.scene_audio_generated', sceneId, {})
    return this.get(workspaceId, projectId)
  }

  async updateScene(workspaceId: string, projectId: string, sceneId: string, actorId: string, dto: UpdateVideoSceneDto) {
    await this.assertScene(workspaceId, projectId, sceneId)
    await this.prisma.videoScene.update({ where: { id: sceneId }, data: dto })
    await this.invalidateRender(projectId)
    await this.audit(workspaceId, actorId, 'video.scene_updated', sceneId, dto)
    return this.get(workspaceId, projectId)
  }

  async addScene(workspaceId: string, projectId: string, actorId: string) {
    const project = await this.findProject(workspaceId, projectId)
    if (project.scenes.length >= 12) throw new BadRequestException('Một video hỗ trợ tối đa 12 phân cảnh.')
    const position = project.scenes.length ? Math.max(...project.scenes.map(scene => scene.position)) + 1 : 0
    const scene = await this.prisma.videoScene.create({ data: {
      projectId, position, title: `Cảnh ${position + 1}`, narration: 'Nhập lời thoại cho phân cảnh mới.',
      visualPrompt: 'A cinematic brand-consistent video frame, clean composition, natural light, no text', durationMs: 5000,
    } })
    await this.invalidateRender(projectId)
    await this.audit(workspaceId, actorId, 'video.scene_created', scene.id, { position })
    return this.get(workspaceId, projectId)
  }

  async deleteScene(workspaceId: string, projectId: string, sceneId: string, actorId: string) {
    const project = await this.findProject(workspaceId, projectId)
    if (project.scenes.length <= 1) throw new BadRequestException('Video phải có ít nhất một phân cảnh.')
    const scene = project.scenes.find(item => item.id === sceneId)
    if (!scene) throw new NotFoundException('Không tìm thấy phân cảnh.')
    await this.prisma.$transaction(async tx => {
      await tx.videoScene.delete({ where: { id: sceneId } })
      const remaining = project.scenes.filter(item => item.id !== sceneId)
      for (let index = 0; index < remaining.length; index += 1) await tx.videoScene.update({ where: { id: remaining[index].id }, data: { position: index + 1000 } })
      for (let index = 0; index < remaining.length; index += 1) await tx.videoScene.update({ where: { id: remaining[index].id }, data: { position: index } })
    })
    await Promise.allSettled([this.storage.remove(scene.visualStorageKey), this.storage.remove(scene.narrationStorageKey)])
    await this.invalidateRender(projectId)
    await this.audit(workspaceId, actorId, 'video.scene_deleted', sceneId, {})
    return this.get(workspaceId, projectId)
  }

  async reorderScenes(workspaceId: string, projectId: string, actorId: string, sceneIds: string[]) {
    const project = await this.findProject(workspaceId, projectId)
    const currentIds = project.scenes.map(scene => scene.id).sort()
    if (sceneIds.length !== currentIds.length || sceneIds.slice().sort().some((id, index) => id !== currentIds[index])) {
      throw new BadRequestException('Danh sách scene không khớp project.')
    }
    await this.prisma.$transaction(async tx => {
      for (let index = 0; index < sceneIds.length; index += 1) await tx.videoScene.update({ where: { id: sceneIds[index] }, data: { position: index + 1000 } })
      for (let index = 0; index < sceneIds.length; index += 1) await tx.videoScene.update({ where: { id: sceneIds[index] }, data: { position: index } })
      await tx.videoProject.update({ where: { id: projectId }, data: { status: VideoProjectStatus.READY_TO_EDIT, outputStorageKey: null, thumbnailStorageKey: null } })
    })
    await this.audit(workspaceId, actorId, 'video.scenes_reordered', projectId, { sceneIds })
    return this.get(workspaceId, projectId)
  }

  async uploadSceneAsset(workspaceId: string, projectId: string, sceneId: string, actorId: string, upload: Upload) {
    const scene = await this.assertScene(workspaceId, projectId, sceneId)
    if (!upload.mimeType.startsWith('image/') && !upload.mimeType.startsWith('video/')) throw new BadRequestException('Chỉ hỗ trợ file ảnh hoặc video.')
    const extension = this.safeExtension(upload.filename, upload.mimeType)
    const key = `workspaces/${workspaceId}/videos/${projectId}/scenes/${sceneId}/visual-${randomUUID()}${extension}`
    await this.storage.put(key, upload.buffer, upload.mimeType)
    await this.prisma.videoScene.update({
      where: { id: sceneId },
      data: { visualStorageKey: key, visualMimeType: upload.mimeType, assetType: upload.mimeType.startsWith('video/') ? VideoAssetType.UPLOADED_VIDEO : VideoAssetType.UPLOADED_IMAGE },
    })
    await this.storage.remove(scene.visualStorageKey)
    await this.invalidateRender(projectId)
    await this.audit(workspaceId, actorId, 'video.scene_asset_uploaded', sceneId, { mimeType: upload.mimeType, size: upload.buffer.length })
    return this.get(workspaceId, projectId)
  }

  async uploadMusic(workspaceId: string, projectId: string, actorId: string, upload: Upload) {
    const project = await this.findProject(workspaceId, projectId)
    if (!upload.mimeType.startsWith('audio/')) throw new BadRequestException('Nhạc nền phải là file audio.')
    const key = `workspaces/${workspaceId}/videos/${projectId}/music/${randomUUID()}${this.safeExtension(upload.filename, upload.mimeType)}`
    await this.storage.put(key, upload.buffer, upload.mimeType)
    await this.prisma.videoProject.update({ where: { id: projectId }, data: { musicStorageKey: key, musicMimeType: upload.mimeType, status: VideoProjectStatus.READY_TO_EDIT, outputStorageKey: null, thumbnailStorageKey: null } })
    await this.storage.remove(project.musicStorageKey)
    await this.audit(workspaceId, actorId, 'video.music_uploaded', projectId, { mimeType: upload.mimeType, size: upload.buffer.length })
    return this.get(workspaceId, projectId)
  }

  async render(workspaceId: string, projectId: string, actorId: string) {
    const project = await this.findProject(workspaceId, projectId)
    if (!project.scenes.length) throw new BadRequestException('Video chưa có phân cảnh.')
    if (project.scenes.some(scene => !scene.visualStorageKey)) throw new BadRequestException('Mỗi phân cảnh cần ảnh hoặc video trước khi render.')
    await this.prisma.videoProject.update({ where: { id: projectId }, data: { status: VideoProjectStatus.RENDERING, errorMessage: null } })
    void this.renderProject(projectId, actorId)
    return { id: projectId, status: VideoProjectStatus.RENDERING }
  }

  async delete(workspaceId: string, projectId: string, actorId: string) {
    const project = await this.findProject(workspaceId, projectId)
    const keys = [project.outputStorageKey, project.thumbnailStorageKey, project.musicStorageKey, ...project.scenes.flatMap(scene => [scene.visualStorageKey, scene.narrationStorageKey])]
    await Promise.allSettled(keys.map(key => this.storage.remove(key)))
    await this.prisma.videoProject.delete({ where: { id: projectId } })
    await this.audit(workspaceId, actorId, 'video.project_deleted', projectId, {})
  }

  async voices(workspaceId: string) {
    return this.prisma.voiceProfile.findMany({ where: { workspaceId }, select: { id: true, name: true, language: true, status: true, errorMessage: true, createdAt: true }, orderBy: { createdAt: 'desc' } })
  }

  async createVoice(workspaceId: string, actorId: string, input: { name: string; language: string; consent: Upload; sample: Upload }) {
    if (!this.ai.mediaConfiguration().customVoices) throw new ServiceUnavailableException('Cần OPENAI_API_KEY và quyền Custom Voices để thêm giọng riêng.')
    if (!input.consent.mimeType.startsWith('audio/') && !input.consent.mimeType.startsWith('video/')) throw new BadRequestException('Consent phải là file audio hoặc video.')
    if (!input.sample.mimeType.startsWith('audio/') && !input.sample.mimeType.startsWith('video/')) throw new BadRequestException('Voice sample phải là file audio hoặc video.')
    if (input.consent.buffer.length > 20 * 1024 * 1024 || input.sample.buffer.length > 20 * 1024 * 1024) throw new BadRequestException('Mỗi file custom voice phải nhỏ hơn 20 MB.')
    const sampleDuration = await this.renderer.durationMs(input.sample.buffer, input.sample.mimeType)
    if (sampleDuration > 30_000) throw new BadRequestException('Voice sample phải dài tối đa 30 giây.')
    const voice = await this.prisma.voiceProfile.create({ data: { workspaceId, createdById: actorId, name: input.name.slice(0, 80), language: input.language.slice(0, 8), status: VoiceProfileStatus.CREATING } })
    void this.createVoiceInBackground(voice.id, workspaceId, actorId, input)
    return voice
  }

  private async planAndGenerate(projectId: string, dto: CreateVideoProjectDto, actorId: string) {
    try {
      const project = await this.prisma.videoProject.findUniqueOrThrow({
        where: { id: projectId }, include: { workspace: { select: { name: true, companyProfile: true } } },
      })
      const storyboard = await this.ai.plan(dto, project.workspace, actorId)
      const settings = { ...(project.settings as Record<string, unknown>), creativeDirection: storyboard.creativeDirection }
      const shouldGenerateAssets = dto.autoGenerateAssets !== false
      await this.prisma.$transaction([
        this.prisma.videoScene.deleteMany({ where: { projectId } }),
        this.prisma.videoProject.update({ where: { id: projectId }, data: {
          settings: settings as Prisma.InputJsonValue,
          status: shouldGenerateAssets ? VideoProjectStatus.GENERATING_ASSETS : VideoProjectStatus.READY_TO_EDIT,
          errorMessage: null,
        } }),
        ...storyboard.scenes.map((scene, position) => this.prisma.videoScene.create({ data: {
          projectId, position, title: scene.title, narration: scene.narration, visualPrompt: scene.visualPrompt,
          durationMs: Math.round(scene.durationSeconds * 1000), assetType: VideoAssetType.GENERATED_IMAGE,
        } })),
      ])
      if (!shouldGenerateAssets) return
      if (this.ai.mediaConfiguration().configured) await this.generateAssets(projectId, actorId)
      else await this.prisma.videoProject.update({ where: { id: projectId }, data: { status: VideoProjectStatus.READY_TO_EDIT, errorMessage: 'Storyboard đã sẵn sàng. Thêm OPENAI_API_KEY để tạo ảnh và giọng đọc tự động, hoặc tải asset riêng lên từng scene.' } })
    } catch (error) {
      await this.fail(projectId, error, 'Không thể lập storyboard video.')
    }
  }

  private async generateAssets(projectId: string, actorId: string) {
    try {
      const project = await this.prisma.videoProject.findUniqueOrThrow({ where: { id: projectId }, include: { scenes: { orderBy: { position: 'asc' } }, voiceProfile: true } })
      for (const scene of project.scenes) {
        await Promise.all([this.generateSceneImageAsset(project, scene), this.generateSceneAudioAsset(project, scene)])
      }
      const aggregate = await this.prisma.videoScene.aggregate({ where: { projectId }, _sum: { durationMs: true } })
      await this.prisma.videoProject.update({ where: { id: projectId }, data: { status: VideoProjectStatus.READY_TO_EDIT, durationMs: aggregate._sum.durationMs || null, errorMessage: null } })
      await this.audit(project.workspaceId, actorId, 'video.assets_generated', projectId, { sceneCount: project.scenes.length })
    } catch (error) {
      await this.fail(projectId, error, 'Không thể tạo ảnh hoặc giọng đọc. Kiểm tra API key, quyền model và quota.')
    }
  }

  private async generateImagesOnly(projectId: string, actorId: string) {
    try {
      const project = await this.prisma.videoProject.findUniqueOrThrow({ where: { id: projectId }, include: { scenes: { orderBy: { position: 'asc' } }, voiceProfile: true } })
      for (const scene of project.scenes) await this.generateSceneImageAsset(project, scene)
      await this.prisma.videoProject.update({ where: { id: projectId }, data: { status: VideoProjectStatus.READY_TO_EDIT, outputStorageKey: null, thumbnailStorageKey: null, errorMessage: null } })
      await this.audit(project.workspaceId, actorId, 'video.images_generated', projectId, { sceneCount: project.scenes.length })
    } catch (error) {
      await this.fail(projectId, error, 'Không thể tạo hình ảnh. Kiểm tra API key, quyền model và quota.')
    }
  }

  private async generateAudioOnly(projectId: string, actorId: string) {
    try {
      const project = await this.prisma.videoProject.findUniqueOrThrow({ where: { id: projectId }, include: { scenes: { orderBy: { position: 'asc' } }, voiceProfile: true } })
      for (const scene of project.scenes) await this.generateSceneAudioAsset(project, scene)
      const aggregate = await this.prisma.videoScene.aggregate({ where: { projectId }, _sum: { durationMs: true } })
      await this.prisma.videoProject.update({ where: { id: projectId }, data: {
        status: VideoProjectStatus.READY_TO_EDIT, durationMs: aggregate._sum.durationMs || null,
        outputStorageKey: null, thumbnailStorageKey: null, errorMessage: null,
      } })
      await this.audit(project.workspaceId, actorId, 'video.audio_generated', projectId, { sceneCount: project.scenes.length })
    } catch (error) {
      await this.fail(projectId, error, 'Không thể tạo giọng đọc. Kiểm tra API key, quyền model và quota.')
    }
  }

  private async generateSceneImageAsset(project: GenerationProject, scene: GenerationScene) {
    const settings = project.settings as Record<string, unknown>
    const image = await this.ai.generateImage(
      `${scene.visualPrompt}\nOverall art direction: ${settings.creativeDirection || ''}. Visual style: ${settings.visualStyle || 'editorial'}.`,
      project.ratio,
      String(settings.imageQuality || 'medium'),
    )
    const key = `workspaces/${project.workspaceId}/videos/${project.id}/scenes/${scene.id}/generated-${randomUUID()}.png`
    await this.storage.put(key, image, 'image/png')
    await this.prisma.videoScene.update({ where: { id: scene.id }, data: {
      visualStorageKey: key, visualMimeType: 'image/png', assetType: VideoAssetType.GENERATED_IMAGE,
    } })
    await this.storage.remove(scene.visualStorageKey)
  }

  private async generateSceneAudioAsset(project: GenerationProject, scene: GenerationScene) {
    const settings = project.settings as Record<string, unknown>
    const voice = project.voiceProfile?.providerVoiceId ? { id: project.voiceProfile.providerVoiceId } : String(settings.voiceId || 'marin')
    const audio = await this.ai.generateSpeech(
      scene.narration,
      voice,
      String(settings.voiceInstructions || `Vietnamese ${settings.tone || 'natural'} voice, ${settings.pace || 'balanced'} pace.`),
    )
    const key = `workspaces/${project.workspaceId}/videos/${project.id}/scenes/${scene.id}/narration-${randomUUID()}.mp3`
    await this.storage.put(key, audio, 'audio/mpeg')
    const audioDuration = await this.renderer.durationMs(audio, 'audio/mpeg')
    await this.prisma.videoScene.update({ where: { id: scene.id }, data: {
      narrationStorageKey: key, narrationMimeType: 'audio/mpeg', durationMs: Math.max(scene.durationMs, audioDuration + 350),
    } })
    await this.storage.remove(scene.narrationStorageKey)
  }

  private async renderProject(projectId: string, actorId: string) {
    try {
      const project = await this.prisma.videoProject.findUniqueOrThrow({ where: { id: projectId }, include: { scenes: { orderBy: { position: 'asc' } } } })
      const result = await this.renderer.render(project)
      const aggregate = project.scenes.reduce((sum, scene) => sum + scene.durationMs, 0)
      await this.prisma.videoProject.update({ where: { id: projectId }, data: { status: VideoProjectStatus.COMPLETED, outputStorageKey: result.outputKey, thumbnailStorageKey: result.thumbnailKey, outputMimeType: 'video/mp4', durationMs: aggregate, errorMessage: null } })
      await this.audit(project.workspaceId, actorId, 'video.render_completed', projectId, { durationMs: aggregate })
    } catch (error) {
      await this.fail(projectId, error, 'Render video thất bại.')
    }
  }

  private async createVoiceInBackground(id: string, workspaceId: string, actorId: string, input: { name: string; language: string; consent: Upload; sample: Upload }) {
    try {
      const base = `workspaces/${workspaceId}/voices/${id}`
      const consentKey = `${base}/consent${this.safeExtension(input.consent.filename, input.consent.mimeType)}`
      const sampleKey = `${base}/sample${this.safeExtension(input.sample.filename, input.sample.mimeType)}`
      await Promise.all([this.storage.put(consentKey, input.consent.buffer, input.consent.mimeType), this.storage.put(sampleKey, input.sample.buffer, input.sample.mimeType)])
      const created = await this.ai.createCustomVoice(input.name, input.language, input.consent, input.sample)
      await this.prisma.voiceProfile.update({ where: { id }, data: { status: VoiceProfileStatus.READY, providerVoiceId: created.voiceId, consentStorageKey: consentKey, sampleStorageKey: sampleKey, errorMessage: null } })
      await this.audit(workspaceId, actorId, 'video.voice_created', id, { language: input.language })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tạo giọng nói.'
      await this.prisma.voiceProfile.update({ where: { id }, data: { status: VoiceProfileStatus.FAILED, errorMessage: message.slice(0, 1000) } })
    }
  }

  private async presentProject(project: Awaited<ReturnType<VideosService['findProject']>> | Record<string, any>, includeScenes: boolean) {
    const scenes = includeScenes ? await Promise.all((project.scenes || []).map(async (scene: Record<string, any>) => ({
      ...scene,
      visualUrl: await this.storage.signedUrl(scene.visualStorageKey),
      narrationUrl: await this.storage.signedUrl(scene.narrationStorageKey),
    }))) : undefined
    return {
      ...project,
      scenes,
      outputUrl: await this.storage.signedUrl(project.outputStorageKey),
      downloadUrl: await this.storage.signedUrl(project.outputStorageKey, `${project.title}.mp4`),
      thumbnailUrl: await this.storage.signedUrl(project.thumbnailStorageKey || project.scenes?.[0]?.visualStorageKey),
      musicUrl: includeScenes ? await this.storage.signedUrl(project.musicStorageKey) : undefined,
      outputStorageKey: undefined, thumbnailStorageKey: undefined, musicStorageKey: undefined,
    }
  }

  private async findProject(workspaceId: string, projectId: string) {
    const project = await this.prisma.videoProject.findFirst({ where: { id: projectId, workspaceId }, include: { scenes: { orderBy: { position: 'asc' } }, voiceProfile: { select: { id: true, name: true, status: true } } } })
    if (!project) throw new NotFoundException('Không tìm thấy video project.')
    return project
  }

  private async findGenerationProject(workspaceId: string, projectId: string) {
    const project = await this.prisma.videoProject.findFirst({
      where: { id: projectId, workspaceId },
      include: { scenes: { orderBy: { position: 'asc' } }, voiceProfile: true },
    })
    if (!project) throw new NotFoundException('Không tìm thấy video project.')
    return project
  }

  private async assertScene(workspaceId: string, projectId: string, sceneId: string) {
    const scene = await this.prisma.videoScene.findFirst({ where: { id: sceneId, projectId, project: { workspaceId } } })
    if (!scene) throw new NotFoundException('Không tìm thấy phân cảnh.')
    return scene
  }

  private async assertVoice(workspaceId: string, voiceProfileId: string) {
    const voice = await this.prisma.voiceProfile.findFirst({ where: { id: voiceProfileId, workspaceId, status: VoiceProfileStatus.READY } })
    if (!voice) throw new BadRequestException('Custom voice chưa sẵn sàng hoặc không thuộc workspace này.')
  }

  private async invalidateRender(projectId: string) {
    await this.prisma.videoProject.update({ where: { id: projectId }, data: { status: VideoProjectStatus.READY_TO_EDIT, outputStorageKey: null, thumbnailStorageKey: null, errorMessage: null } })
  }

  private async fail(projectId: string, error: unknown, prefix: string) {
    const detail = error instanceof Error ? error.message : 'Unknown error'
    this.logger.warn(`${prefix} ${detail}`)
    await this.prisma.videoProject.update({ where: { id: projectId }, data: { status: VideoProjectStatus.FAILED, errorMessage: `${prefix} ${detail}`.slice(0, 1800) } }).catch(() => undefined)
  }

  private safeExtension(filename: string, mimeType: string) {
    const match = filename.toLowerCase().match(/\.(png|jpe?g|webp|mp4|mov|webm|mp3|wav|ogg|aac|m4a)$/)
    if (match) return match[0] === '.jpeg' ? '.jpg' : match[0]
    if (mimeType.includes('png')) return '.png'
    if (mimeType.includes('jpeg')) return '.jpg'
    if (mimeType.includes('webm')) return '.webm'
    if (mimeType.startsWith('video/')) return '.mp4'
    if (mimeType.includes('wav')) return '.wav'
    return '.mp3'
  }

  private audit(workspaceId: string, actorId: string, action: string, entityId: string, metadata: unknown) {
    return this.prisma.auditLog.create({ data: { workspaceId, actorId, action, entityType: 'VideoProject', entityId, metadata: metadata as Prisma.InputJsonValue } })
  }
}
