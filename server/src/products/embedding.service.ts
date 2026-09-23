import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import OpenAI from 'openai'

@Injectable()
export class EmbeddingService {
  private readonly client: OpenAI | null
  private readonly model: string
  private readonly provider: 'openai' | 'ollama'
  private readonly ollamaUrl: string

  constructor(config: ConfigService) {
    const configuredProvider = config.get<string>('EMBEDDING_PROVIDER')?.trim().toLowerCase()
    this.provider = configuredProvider === 'ollama' ? 'ollama' : 'openai'
    const apiKey = config.get<string>('EMBEDDING_API_KEY')?.trim()
      || config.get<string>('OPENAI_API_KEY')?.trim()
    const baseURL = config.get<string>('EMBEDDING_BASE_URL')?.trim()

    this.model = config.get<string>('EMBEDDING_MODEL')?.trim()
      || (this.provider === 'ollama' ? 'embeddinggemma' : 'text-embedding-3-small')
    this.ollamaUrl = config.get<string>('OLLAMA_URL')?.trim().replace(/\/+$/, '') || 'http://localhost:11434'
    this.client = this.provider === 'openai' && apiKey
      ? new OpenAI({ apiKey, baseURL: baseURL || undefined, timeout: 60_000, maxRetries: 1 })
      : null
  }

  get modelName() {
    return this.model
  }

  async embed(input: string[]) {
    if (this.provider === 'ollama') return this.embedWithOllama(input)
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình EMBEDDING_API_KEY hoặc OPENAI_API_KEY để tạo vector cho tài liệu.',
      )
    }
    if (!input.length) return [] as number[][]

    const response = await this.client.embeddings.create({
      model: this.model,
      input,
    })

    return [...response.data]
      .sort((left, right) => left.index - right.index)
      .map(item => item.embedding)
  }

  private async embedWithOllama(input: string[]) {
    if (!input.length) return [] as number[][]

    try {
      const response = await fetch(`${this.ollamaUrl}/api/embed`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: this.model, input }),
      })
      const body = await response.text()
      let payload: unknown = undefined
      try {
        payload = body ? JSON.parse(body) : undefined
      } catch {
        payload = body
      }

      if (!response.ok) {
        const detail = typeof payload === 'object' && payload !== null
          ? JSON.stringify(payload).slice(0, 500)
          : String(payload || response.statusText).slice(0, 500)
        throw new ServiceUnavailableException(`Ollama embedding failed (${response.status}): ${detail}`)
      }

      const embeddings = (payload as { embeddings?: unknown } | undefined)?.embeddings
      if (!Array.isArray(embeddings) || !embeddings.every(vector => Array.isArray(vector))) {
        throw new ServiceUnavailableException('Ollama không trả về danh sách embedding hợp lệ.')
      }
      return embeddings as number[][]
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error
      throw new ServiceUnavailableException(
        'Không thể kết nối Ollama. Hãy kiểm tra Ollama đang chạy tại OLLAMA_URL.',
      )
    }
  }
}
