import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { DocumentStatus, DocumentType, Prisma, ProductStatus } from '@prisma/client'
import { createHash } from 'node:crypto'
import { extname, basename } from 'node:path'
import pdfParse from 'pdf-parse'
import { PrismaService } from '../prisma/prisma.service'
import { CreateProductDto } from './dto/create-product.dto'
import { KnowledgeIndexService } from './knowledge-index.service'

type UploadFile = {
  filename: string
  mimetype: string
  toBuffer: () => Promise<Buffer>
}

@Injectable()
export class ProductsService {
  private readonly s3: S3Client
  private readonly bucket: string
  private bucketReady: Promise<void> | null = null

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
    private readonly knowledgeIndex: KnowledgeIndexService,
  ) {
    const endpoint = config.get<string>('S3_ENDPOINT')
    this.bucket = config.get<string>('S3_BUCKET') || 'milo-documents'
    this.s3 = new S3Client({
      endpoint,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.get<string>('S3_ACCESS_KEY') || 'milo',
        secretAccessKey: config.get<string>('S3_SECRET_KEY') || 'milo_dev_password',
      },
    })
  }

  list(workspaceId: string) {
    return this.prisma.product.findMany({
      where: { workspaceId },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        documents: {
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            tags: true,
            updatedAt: true,
            versions: {
              orderBy: { version: 'desc' },
              take: 1,
              select: { version: true, mimeType: true, sizeBytes: true, createdAt: true },
            },
          },
        },
      },
    })
  }

  async create(workspaceId: string, actorId: string, dto: CreateProductDto) {
    const name = dto.name.trim()
    if (!name) throw new BadRequestException('Tên product không được để trống.')
    const slug = dto.slug?.trim() || this.slugify(name)
    const duplicate = await this.prisma.product.findUnique({
      where: { workspaceId_slug: { workspaceId, slug } },
      select: { id: true },
    })
    if (duplicate) throw new ConflictException('Product này đã tồn tại trong workspace.')

    const product = await this.prisma.product.create({
      data: { workspaceId, name, slug, description: dto.description?.trim() || null },
      select: { id: true, name: true, slug: true, description: true, status: true, createdAt: true },
    })
    await this.audit(workspaceId, actorId, 'product.created', 'Product', product.id, { name: product.name })
    return product
  }

  async uploadDocument(workspaceId: string, productId: string, actorId: string, file: UploadFile) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, workspaceId, status: ProductStatus.ACTIVE },
      select: { id: true, name: true },
    })
    if (!product) throw new NotFoundException('Không tìm thấy product trong workspace.')

    const extension = extname(file.filename).toLocaleLowerCase()
    if (!['.txt', '.md', '.pdf'].includes(extension)) {
      throw new BadRequestException('Chỉ hỗ trợ file .txt, .md hoặc .pdf.')
    }
    const buffer = await file.toBuffer()
    if (!buffer.length) throw new BadRequestException('File không có dữ liệu.')
    if (buffer.length > 10 * 1024 * 1024) throw new BadRequestException('File không được vượt quá 10MB.')

    const extractedText = await this.extractText(buffer, extension)
    if (extractedText.length < 30) throw new BadRequestException('Không trích xuất được đủ nội dung từ file để làm product knowledge.')
    const project = await this.ensureKnowledgeProject(workspaceId, actorId)
    const cleanName = basename(file.filename).slice(0, 180)
    const document = await this.prisma.document.create({
      data: {
        projectId: project.id,
        productId: product.id,
        name: cleanName,
        type: DocumentType.PRODUCT,
        status: DocumentStatus.PROCESSING,
        tags: ['product-knowledge', extension.slice(1)],
        uploadedById: actorId,
      },
      select: { id: true },
    })
    const version = 1
    const storageKey = `workspaces/${workspaceId}/products/${product.id}/documents/${document.id}/v${version}-${this.safeFileName(file.filename)}`
    const checksum = createHash('sha256').update(buffer).digest('hex')
    let documentVersionId = ''

    try {
      await this.putObject(storageKey, buffer, file.mimetype || this.mimeType(extension))
      const chunks = this.chunkText(extractedText)
      await this.prisma.$transaction(async tx => {
        const documentVersion = await tx.documentVersion.create({
          data: {
            documentId: document.id,
            version,
            storageKey,
            mimeType: file.mimetype || this.mimeType(extension),
            sizeBytes: buffer.length,
            extractedText,
            checksum,
          },
          select: { id: true },
        })
        documentVersionId = documentVersion.id
        await tx.documentChunk.createMany({
          data: chunks.map((content, position) => ({
            documentVersionId: documentVersion.id,
            position,
            content,
            metadata: { productId: product.id, productName: product.name, sourceFile: cleanName },
          })),
        })
        await tx.document.update({ where: { id: document.id }, data: { status: DocumentStatus.READY } })
      })
    } catch (error) {
      await this.prisma.document.update({ where: { id: document.id }, data: { status: DocumentStatus.FAILED } }).catch(() => undefined)
      if (error instanceof ServiceUnavailableException) throw error
      throw new BadRequestException('Không thể lưu hoặc xử lý file product.')
    }

    let indexing: { indexed: boolean; chunks?: number; embeddingModel?: string; reason?: string; error?: string } = {
      indexed: false,
      reason: 'disabled',
    }
    if (this.knowledgeIndex.isEnabled) {
      try {
        indexing = await this.knowledgeIndex.indexDocumentVersion(documentVersionId)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Không thể index tài liệu vào ChromaDB.'
        await this.prisma.documentVersion.update({
          where: { id: documentVersionId },
          data: { indexError: message },
        }).catch(() => undefined)
        indexing = { indexed: false, error: message }
      }
    }

    await this.audit(workspaceId, actorId, 'product.document_uploaded', 'Document', document.id, {
      productId: product.id,
      productName: product.name,
      fileName: cleanName,
      mimeType: file.mimetype || this.mimeType(extension),
      checksum,
    })
    return { product, document: { id: document.id, name: cleanName, type: DocumentType.PRODUCT, status: DocumentStatus.READY, storageKey, checksum, extractedCharacters: extractedText.length, chunks: this.chunkText(extractedText).length, indexing } }
  }

  private async extractText(buffer: Buffer, extension: string) {
    if (extension !== '.pdf') return buffer.toString('utf8').replace(/\u0000/g, '').trim()
    try {
      const parsed = await pdfParse(buffer)
      return parsed.text.replace(/\u0000/g, '').trim()
    } catch {
      throw new BadRequestException('Không đọc được nội dung PDF. Hãy kiểm tra file có bị lỗi hoặc được mã hóa hay không.')
    }
  }

  private chunkText(text: string) {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    const size = 2400
    const chunks: string[] = []
    for (let position = 0; position < normalized.length; position += size) {
      chunks.push(normalized.slice(position, position + size).trim())
    }
    return chunks.filter(Boolean)
  }

  private async ensureKnowledgeProject(workspaceId: string, actorId: string) {
    const name = 'Product Knowledge'
    const existing = await this.prisma.project.findFirst({ where: { workspaceId, name: { in: [name, 'Product Knowledge - Sample Technology Products'] } }, select: { id: true } })
    if (existing) return existing
    return this.prisma.project.create({
      data: { workspaceId, name, description: 'Tài liệu knowledge của các product trong workspace.', createdById: actorId },
      select: { id: true },
    })
  }

  private async putObject(key: string, body: Buffer, contentType: string) {
    try {
      await this.ensureBucket()
      await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }))
    } catch {
      throw new ServiceUnavailableException('Không thể lưu file vào MinIO. Hãy kiểm tra Docker MinIO và cấu hình S3.')
    }
  }

  private ensureBucket() {
    if (!this.bucketReady) {
      this.bucketReady = (async () => {
        try {
          await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }))
        } catch {
          await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }))
        }
      })().catch(error => {
        this.bucketReady = null
        throw error
      })
    }
    return this.bucketReady
  }

  private mimeType(extension: string) {
    return extension === '.pdf' ? 'application/pdf' : 'text/plain; charset=utf-8'
  }

  private safeFileName(value: string) {
    return value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 150) || 'document'
  }

  private slugify(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product'
  }

  private audit(workspaceId: string, actorId: string, action: string, entityType: string, entityId: string, metadata: Prisma.InputJsonValue) {
    return this.prisma.auditLog.create({ data: { workspaceId, actorId, action, entityType, entityId, metadata } })
  }
}
