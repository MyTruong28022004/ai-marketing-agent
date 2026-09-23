import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import OpenAI from 'openai'
import { AiProvider, createAiRuntime, gatewayReasoning } from '../ai/ai-provider'
import { CreateVideoProjectDto } from './dto/create-video-project.dto'
import { GenerateVideoScriptDto } from './dto/generate-video-script.dto'

type CodexSdkModule = typeof import('@openai/codex-sdk')
const importEsm = new Function('modulePath', 'return import(modulePath)') as (modulePath: string) => Promise<unknown>

const storyboardSchema = {
  type: 'object', additionalProperties: false, required: ['creativeDirection', 'scenes'],
  properties: {
    creativeDirection: { type: 'string' },
    scenes: {
      type: 'array', minItems: 2, maxItems: 8, items: {
        type: 'object', additionalProperties: false,
        required: ['title', 'narration', 'visualPrompt', 'durationSeconds'],
        properties: {
          title: { type: 'string' }, narration: { type: 'string' }, visualPrompt: { type: 'string' },
          durationSeconds: { type: 'number', minimum: 2, maximum: 20 },
        },
      },
    },
  },
} as const

const videoScriptSchema = {
  type: 'object', additionalProperties: false, required: ['title', 'script'],
  properties: {
    title: { type: 'string' },
    script: { type: 'string' },
  },
} as const

export type Storyboard = {
  creativeDirection: string
  scenes: Array<{ title: string; narration: string; visualPrompt: string; durationSeconds: number }>
}

type VideoScript = { title: string; script: string }

@Injectable()
export class VideoAiService {
  private readonly provider: AiProvider
  private readonly model: string | undefined
  private readonly textClient: OpenAI | null
  private readonly codexModel: string | undefined
  private readonly mediaClient: OpenAI | null
  private readonly openAiKey: string | undefined
  private readonly imageModel: string
  private readonly speechModel: string

  constructor(config: ConfigService) {
    const runtime = createAiRuntime(config, 240_000)
    this.provider = runtime.provider
    this.model = runtime.model
    this.textClient = runtime.client
    this.codexModel = runtime.provider === 'codex-local' ? runtime.model : undefined
    this.openAiKey = config.get<string>('OPENAI_API_KEY')?.trim() || undefined
    this.mediaClient = this.openAiKey ? new OpenAI({ apiKey: this.openAiKey, timeout: 300_000, maxRetries: 1 }) : null
    this.imageModel = config.get<string>('OPENAI_IMAGE_MODEL')?.trim() || 'gpt-image-2.5-flare'
    this.speechModel = config.get<string>('OPENAI_SPEECH_MODEL')?.trim() || 'gpt-4o-mini-tts'
  }

  async generateScript(dto: GenerateVideoScriptDto, workspaceContext: unknown, actorId: string) {
    const context = { workspace: workspaceContext, brief: dto }
    const instructions = [
      'Bạn là biên kịch video ngắn cho mạng xã hội.',
      'Viết một tiêu đề ngắn và một kịch bản liền mạch, tự nhiên, có hook ngay câu đầu, phần thân rõ ý và CTA phù hợp.',
      'Tuân thủ ngôn ngữ, số từ, phong cách, giọng điệu, đối tượng và CTA trong brief.',
      'Chỉ dùng dữ kiện có trong bối cảnh; không bịa số liệu, giải thưởng, chứng thực, giá hoặc cam kết.',
      'Kịch bản là lời đọc hoàn chỉnh, không thêm markdown, nhãn Scene, Narration hay chỉ dẫn máy quay.',
    ].join(' ')
    if (this.provider === 'codex-local') {
      const { Codex } = await importEsm('@openai/codex-sdk') as CodexSdkModule
      const codex = new Codex()
      const thread = codex.startThread({
        ...(this.codexModel ? { model: this.codexModel } : {}), workingDirectory: resolve(__dirname, '../../..'), skipGitRepoCheck: true,
        sandboxMode: 'read-only', approvalPolicy: 'never', networkAccessEnabled: false, modelReasoningEffort: 'medium',
      })
      const result = await thread.run(`${instructions}\nBối cảnh:\n${JSON.stringify(context)}\nChỉ trả JSON theo schema.`, {
        outputSchema: videoScriptSchema, signal: AbortSignal.timeout(300_000),
      })
      return this.normalizeScript(this.parse<VideoScript>(result.finalResponse))
    }
    if (!this.textClient) throw new ServiceUnavailableException('Chưa cấu hình AI provider để viết kịch bản video.')
    const response = await this.textClient.responses.create({
      model: this.model!, ...gatewayReasoning(this.provider, 'medium'), store: false,
      safety_identifier: createHash('sha256').update(actorId).digest('hex'), max_output_tokens: 3_000,
      instructions, input: `Bối cảnh và brief video:\n${JSON.stringify(context)}`,
      text: { verbosity: 'low', format: { type: 'json_schema', name: 'video_script', strict: true, schema: videoScriptSchema } },
    })
    if (!response.output_text) throw new BadGatewayException('AI không trả về kịch bản video.')
    return this.normalizeScript(this.parse<VideoScript>(response.output_text))
  }

  async plan(dto: CreateVideoProjectDto, workspaceContext: unknown, actorId: string) {
    const context = { workspace: workspaceContext, brief: dto }
    if (this.provider === 'codex-local') {
      const { Codex } = await importEsm('@openai/codex-sdk') as CodexSdkModule
      const codex = new Codex()
      const thread = codex.startThread({
        ...(this.codexModel ? { model: this.codexModel } : {}), workingDirectory: resolve(__dirname, '../../..'), skipGitRepoCheck: true,
        sandboxMode: 'read-only', approvalPolicy: 'never', networkAccessEnabled: false, modelReasoningEffort: 'medium',
      })
      const result = await thread.run(`${this.instructions()}\nBối cảnh:\n${JSON.stringify(context)}\nChỉ trả JSON theo schema.`, { outputSchema: storyboardSchema, signal: AbortSignal.timeout(300_000) })
      return this.normalize(this.parse(result.finalResponse), dto.sceneCount || 5)
    }
    if (!this.textClient) throw new ServiceUnavailableException('Chưa cấu hình AI provider để lập storyboard video.')
    const response = await this.textClient.responses.create({
      model: this.model!, ...gatewayReasoning(this.provider, 'medium'), store: false,
      safety_identifier: createHash('sha256').update(actorId).digest('hex'), max_output_tokens: 4_000,
      instructions: this.instructions(), input: `Bối cảnh và brief video:\n${JSON.stringify(context)}`,
      text: { verbosity: 'low', format: { type: 'json_schema', name: 'video_storyboard', strict: true, schema: storyboardSchema } },
    })
    if (!response.output_text) throw new BadGatewayException('AI không trả về storyboard.')
    return this.normalize(this.parse(response.output_text), dto.sceneCount || 5)
  }

  async generateImage(prompt: string, ratio: string, quality: string) {
    if (!this.mediaClient) throw new ServiceUnavailableException('Cần OPENAI_API_KEY để tạo hình ảnh thật cho video.')
    const result = await this.mediaClient.images.generate({
      model: this.imageModel,
      prompt: `${prompt}\nNo words, no typography, no logos, no watermark. Commercial photography, coherent lighting, production-ready video frame.`,
      size: this.imageSize(ratio),
      quality: this.imageQuality(quality),
      output_format: 'png',
    })
    const base64 = result.data?.[0]?.b64_json
    if (!base64) throw new BadGatewayException('Image API không trả về dữ liệu ảnh.')
    return Buffer.from(base64, 'base64')
  }

  async generateSpeech(input: string, voice: string | { id: string }, instructions?: string) {
    if (!this.mediaClient) throw new ServiceUnavailableException('Cần OPENAI_API_KEY để tạo giọng đọc thật.')
    const response = await this.mediaClient.audio.speech.create({
      model: this.speechModel,
      voice,
      input: input.slice(0, 4096),
      instructions: instructions?.slice(0, 600) || 'Speak natural Vietnamese with clear pronunciation, warm pacing, and subtle emotional emphasis.',
      response_format: 'mp3',
    })
    return Buffer.from(await response.arrayBuffer())
  }

  async createCustomVoice(name: string, language: string, consent: { buffer: Buffer; mimeType: string; filename: string }, sample: { buffer: Buffer; mimeType: string; filename: string }) {
    if (!this.openAiKey) throw new ServiceUnavailableException('Cần OPENAI_API_KEY có quyền custom voice.')
    const consentForm = new FormData()
    consentForm.set('name', `${name}-consent`)
    consentForm.set('language', language)
    consentForm.set('recording', new Blob([new Uint8Array(consent.buffer)], { type: this.baseMime(consent.mimeType) }), consent.filename)
    const consentResponse = await fetch('https://api.openai.com/v1/audio/voice_consents', {
      method: 'POST', headers: { Authorization: `Bearer ${this.openAiKey}` }, body: consentForm,
    })
    const consentData = await this.json(consentResponse)
    if (!consentResponse.ok || !consentData.id) throw new BadGatewayException(this.apiMessage(consentData, 'Không thể xác minh bản ghi consent.'))

    const voiceForm = new FormData()
    voiceForm.set('name', name)
    voiceForm.set('consent', String(consentData.id))
    voiceForm.set('audio_sample', new Blob([new Uint8Array(sample.buffer)], { type: this.baseMime(sample.mimeType) }), sample.filename)
    const voiceResponse = await fetch('https://api.openai.com/v1/audio/voices', {
      method: 'POST', headers: { Authorization: `Bearer ${this.openAiKey}` }, body: voiceForm,
    })
    const voiceData = await this.json(voiceResponse)
    if (!voiceResponse.ok || !voiceData.id) throw new BadGatewayException(this.apiMessage(voiceData, 'Không thể tạo custom voice.'))
    return { consentId: String(consentData.id), voiceId: String(voiceData.id) }
  }

  mediaConfiguration() {
    return {
      configured: Boolean(this.mediaClient), imageModel: this.imageModel, speechModel: this.speechModel,
      customVoices: Boolean(this.mediaClient),
    }
  }

  private instructions() {
    return [
      'Bạn là đạo diễn video marketing và storyboard artist.',
      'Chuyển đúng kịch bản đầu vào thành 2-8 cảnh, không bịa claim, số liệu, chứng thực hoặc ưu đãi.',
      'Bám Brand Voice, đối tượng, văn phong, hook, nhịp và CTA trong brief.',
      'Narration phải là tiếng Việt tự nhiên, ngắn, đọc vừa thời lượng; tổng các cảnh phải bao phủ nội dung kịch bản.',
      'Visual prompt phải bằng tiếng Anh, mô tả rõ chủ thể, hành động, bối cảnh, bố cục, camera, ánh sáng, bảng màu và visual style.',
      'Giữ nhất quán nhân vật, sản phẩm và bảng màu giữa các cảnh. Không yêu cầu AI render chữ trong ảnh vì chữ sẽ được overlay khi dựng video.',
    ].join(' ')
  }

  private normalize(value: Storyboard, count: number) {
    return {
      creativeDirection: String(value.creativeDirection || '').slice(0, 1200),
      scenes: value.scenes.slice(0, Math.max(2, Math.min(8, count))).map((scene, index) => ({
        title: String(scene.title || `Cảnh ${index + 1}`).slice(0, 120),
        narration: String(scene.narration || '').slice(0, 2000),
        visualPrompt: String(scene.visualPrompt || '').slice(0, 2000),
        durationSeconds: Math.max(2, Math.min(20, Number(scene.durationSeconds) || 5)),
      })),
    }
  }

  private normalizeScript(value: VideoScript) {
    return {
      title: String(value.title || '').trim().slice(0, 180),
      script: String(value.script || '').trim().slice(0, 12_000),
    }
  }

  private parse<T = Storyboard>(value: string) { return JSON.parse(value.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '')) as T }
  private imageSize(ratio: string) { return ratio === '16:9' ? '1536x1024' as const : ratio === '1:1' ? '1024x1024' as const : '1024x1536' as const }
  private imageQuality(value: string) { return ['low', 'medium', 'high'].includes(value) ? value as 'low' | 'medium' | 'high' : 'medium' as const }
  private baseMime(value: string) { return value.split(';')[0].trim() || 'audio/webm' }
  private async json(response: Response) { try { return await response.json() as Record<string, unknown> } catch { return {} } }
  private apiMessage(data: Record<string, unknown>, fallback: string) {
    const error = data.error as { message?: string } | undefined
    return error?.message ? `${fallback} ${error.message}` : fallback
  }
}
