import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

type ChromaMetadata = Record<string, string | number | boolean>

export type ChromaRecord = {
  id: string
  embedding: number[]
  document: string
  metadata: ChromaMetadata
}

export type ChromaSearchResult = {
  ids?: string[][]
  documents?: Array<Array<string | null>>
  metadatas?: Array<Array<ChromaMetadata | null>>
  distances?: Array<Array<number | null>>
}

type ChromaCollection = { id: string; name: string }

@Injectable()
export class ChromaService {
  private readonly baseUrl: string
  private readonly tenant: string
  private readonly database: string
  private readonly token: string | undefined
  private readonly collections = new Map<string, Promise<string>>()

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('CHROMA_URL')?.trim().replace(/\/+$/, '') || ''
    this.tenant = config.get<string>('CHROMA_TENANT')?.trim() || 'default_tenant'
    this.database = config.get<string>('CHROMA_DATABASE')?.trim() || 'default_database'
    this.token = config.get<string>('CHROMA_TOKEN')?.trim() || undefined
  }

  get configured() {
    return Boolean(this.baseUrl)
  }

  async upsert(workspaceId: string, records: ChromaRecord[]) {
    if (!records.length) return
    const collectionId = await this.collectionId(workspaceId)
    for (let offset = 0; offset < records.length; offset += 64) {
      const batch = records.slice(offset, offset + 64)
      await this.request(`/collections/${collectionId}/upsert`, {
        method: 'POST',
        body: JSON.stringify({
          ids: batch.map(record => record.id),
          embeddings: batch.map(record => record.embedding),
          documents: batch.map(record => record.document),
          metadatas: batch.map(record => record.metadata),
        }),
      })
    }
  }

  async query(workspaceId: string, embedding: number[], topK: number, productId?: string, documentVersionIds: string[] = []) {
    const collectionId = await this.collectionId(workspaceId)
    const filters: Array<Record<string, unknown>> = [{ workspaceId }]
    if (productId) filters.push({ productId })
    if (documentVersionIds.length) filters.push({ documentVersionId: { $in: documentVersionIds } })
    const where = filters.length === 1 ? filters[0] : { $and: filters }

    return this.request<ChromaSearchResult>(`/collections/${collectionId}/query`, {
      method: 'POST',
      body: JSON.stringify({
        query_embeddings: [embedding],
        n_results: topK,
        where,
        include: ['documents', 'metadatas', 'distances'],
      }),
    })
  }

  private collectionId(workspaceId: string) {
    const existing = this.collections.get(workspaceId)
    if (existing) return existing

    const pending = this.createOrGetCollection(workspaceId).catch(error => {
      this.collections.delete(workspaceId)
      throw error
    })
    this.collections.set(workspaceId, pending)
    return pending
  }

  private async createOrGetCollection(workspaceId: string) {
    const collectionName = `workspace_${workspaceId.replace(/[^a-zA-Z0-9_-]/g, '_')}`
    const collection = await this.request<ChromaCollection>('/collections', {
      method: 'POST',
      body: JSON.stringify({
        name: collectionName,
        get_or_create: true,
        metadata: { workspaceId },
      }),
    })
    return collection.id
  }

  private async request<T = unknown>(path: string, init: RequestInit) {
    if (!this.baseUrl) {
      throw new ServiceUnavailableException('ChromaDB chưa được cấu hình. Hãy thêm CHROMA_URL vào server/.env.')
    }

    const headers = new Headers(init.headers)
    headers.set('content-type', 'application/json')
    if (this.token) headers.set('x-chroma-token', this.token)

    const response = await fetch(
      `${this.baseUrl}/api/v2/tenants/${encodeURIComponent(this.tenant)}/databases/${encodeURIComponent(this.database)}${path}`,
      { ...init, headers },
    )
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
      throw new ServiceUnavailableException(`ChromaDB request failed (${response.status}): ${detail}`)
    }
    return payload as T
  }
}
