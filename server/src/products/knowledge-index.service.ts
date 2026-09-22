import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DocumentStatus, DocumentType } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { ChromaService } from './chroma.service'
import { EmbeddingService } from './embedding.service'

@Injectable()
export class KnowledgeIndexService {
  private readonly enabled: boolean

  constructor(
    private readonly prisma: PrismaService,
    private readonly chroma: ChromaService,
    private readonly embeddings: EmbeddingService,
    config: ConfigService,
  ) {
    this.enabled = config.get<string>('KNOWLEDGE_INDEXING_ENABLED')?.trim().toLowerCase() === 'true'
  }

  get isEnabled() {
    return this.enabled
  }

  async indexDocumentVersion(documentVersionId: string) {
    if (!this.enabled) return { indexed: false, reason: 'disabled' as const }
    if (!this.chroma.configured) {
      throw new ServiceUnavailableException('ChromaDB chưa được cấu hình. Hãy thêm CHROMA_URL vào server/.env.')
    }

    const version = await this.prisma.documentVersion.findUnique({
      where: { id: documentVersionId },
      include: {
        document: {
          include: {
            product: { select: { id: true, workspaceId: true, name: true } },
          },
        },
        chunks: { orderBy: { position: 'asc' } },
      },
    })
    if (!version?.document.product) throw new NotFoundException('Không tìm thấy product của tài liệu.')
    if (!version.chunks.length) return { indexed: true, chunks: 0 }

    const vectors = await this.embeddings.embed(version.chunks.map(chunk => chunk.content))
    if (vectors.length !== version.chunks.length) {
      throw new ServiceUnavailableException('Embedding service trả về số vector không khớp số chunk.')
    }

    const records = version.chunks.map((chunk, index) => ({
      id: chunk.id,
      embedding: vectors[index],
      document: chunk.content,
      metadata: {
        workspaceId: version.document.product!.workspaceId,
        productId: version.document.product!.id,
        documentId: version.documentId,
        documentVersionId: version.id,
        sourceFile: version.document.name,
        storageKey: version.storageKey || '',
        checksum: version.checksum || '',
        position: chunk.position,
      },
    }))
    await this.chroma.upsert(version.document.product.workspaceId, records)

    const indexedAt = new Date()
    await this.prisma.$transaction([
      ...version.chunks.map(chunk => this.prisma.documentChunk.update({
        where: { id: chunk.id },
        data: { vectorId: chunk.id, embeddingModel: this.embeddings.modelName, indexedAt },
      })),
      this.prisma.documentVersion.update({
        where: { id: version.id },
        data: { embeddingModel: this.embeddings.modelName, indexedAt, indexError: null },
      }),
    ])

    return { indexed: true, chunks: records.length, embeddingModel: this.embeddings.modelName }
  }

  async reindexWorkspace(workspaceId: string) {
    if (!this.enabled) {
      throw new ServiceUnavailableException('Knowledge indexing đang tắt. Hãy đặt KNOWLEDGE_INDEXING_ENABLED=true.')
    }
    const versions = await this.prisma.documentVersion.findMany({
      where: {
        document: {
          status: DocumentStatus.READY,
          product: { workspaceId },
        },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })

    let indexedDocuments = 0
    let indexedChunks = 0
    for (const version of versions) {
      const result = await this.indexDocumentVersion(version.id)
      if (result.indexed) {
        indexedDocuments += 1
        indexedChunks += result.chunks || 0
      }
    }
    return { indexedDocuments, indexedChunks }
  }

  async search(workspaceId: string, query: string, topK: number, productId?: string) {
    if (!this.enabled) {
      throw new ServiceUnavailableException('Knowledge indexing đang tắt. Hãy đặt KNOWLEDGE_INDEXING_ENABLED=true.')
    }
    if (productId) {
      const product = await this.prisma.product.findFirst({ where: { id: productId, workspaceId }, select: { id: true } })
      if (!product) throw new NotFoundException('Product không thuộc workspace này.')
    }

    const currentVersionIds = await this.currentDocumentVersionIds(workspaceId, productId)
    if (!currentVersionIds.length) return []

    const [embedding] = await this.embeddings.embed([query])
    const result = await this.chroma.query(workspaceId, embedding, topK, productId, currentVersionIds)
    const ids = result.ids?.[0] || []
    const documents = result.documents?.[0] || []
    const metadatas = result.metadatas?.[0] || []
    const distances = result.distances?.[0] || []

    return ids.map((id, index) => ({
      id,
      content: documents[index] || '',
      metadata: metadatas[index] || {},
      distance: distances[index] ?? null,
    }))
  }

  private async currentDocumentVersionIds(workspaceId: string, productId?: string) {
    const documents = await this.prisma.document.findMany({
      where: {
        type: DocumentType.PRODUCT,
        status: DocumentStatus.READY,
        product: {
          workspaceId,
          ...(productId ? { id: productId } : {}),
        },
      },
      select: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          select: { id: true },
        },
      },
    })
    return documents.flatMap(document => document.versions.map(version => version.id))
  }
}
