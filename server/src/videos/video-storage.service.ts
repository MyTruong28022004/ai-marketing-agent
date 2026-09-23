import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  CreateBucketCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

@Injectable()
export class VideoStorageService implements OnModuleInit {
  private readonly logger = new Logger(VideoStorageService.name)
  private readonly bucket: string
  private readonly client: S3Client
  private readonly publicClient: S3Client

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET') || 'milo-documents'
    const options = {
      region: config.get<string>('S3_REGION') || 'us-east-1',
      endpoint: config.get<string>('S3_ENDPOINT') || 'http://localhost:59002',
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.get<string>('S3_ACCESS_KEY') || 'milo',
        secretAccessKey: config.get<string>('S3_SECRET_KEY') || 'milo_dev_password',
      },
    }
    this.client = new S3Client(options)
    this.publicClient = new S3Client({ ...options, endpoint: config.get<string>('S3_PUBLIC_ENDPOINT') || options.endpoint })
  }

  async onModuleInit() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }))
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }))
      } catch (error) {
        this.logger.warn(`Không thể khởi tạo bucket ${this.bucket}: ${error instanceof Error ? error.message : 'unknown error'}`)
      }
    }
  }

  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }))
    return key
  }

  async get(key: string) {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
    if (!result.Body) throw new Error(`Không tìm thấy asset ${key}`)
    return Buffer.from(await result.Body.transformToByteArray())
  }

  async signedUrl(key?: string | null, downloadName?: string) {
    if (!key) return null
    return getSignedUrl(this.publicClient, new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ...(downloadName ? { ResponseContentDisposition: `attachment; filename="${downloadName.replace(/[^ -~]/g, '_')}"` } : {}),
    }), { expiresIn: 60 * 60 })
  }

  async remove(key?: string | null) {
    if (!key) return
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }
}
