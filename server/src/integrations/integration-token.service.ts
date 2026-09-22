import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

@Injectable()
export class IntegrationTokenService {
  private readonly key: Buffer

  constructor(config: ConfigService) {
    const secret = config.get<string>('INTEGRATION_ENCRYPTION_KEY') || config.getOrThrow<string>('JWT_ACCESS_SECRET')
    this.key = createHash('sha256').update(secret).digest()
  }

  encrypt(value: string) {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.')
  }

  decrypt(value: string) {
    const [version, ivValue, tagValue, encryptedValue] = value.split('.')
    if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) throw new Error('Invalid encrypted integration token')
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivValue, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
  }
}
