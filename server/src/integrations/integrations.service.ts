import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { IntegrationProvider, IntegrationStatus, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { ConnectSocialDto } from './dto/connect-social.dto'

const socialProviders: IntegrationProvider[] = [
  IntegrationProvider.FACEBOOK,
  IntegrationProvider.INSTAGRAM,
  IntegrationProvider.TIKTOK,
  IntegrationProvider.YOUTUBE,
  IntegrationProvider.LINKEDIN,
]

const providerHosts: Record<string, string[]> = {
  FACEBOOK: ['facebook.com', 'fb.com'],
  INSTAGRAM: ['instagram.com'],
  TIKTOK: ['tiktok.com'],
  YOUTUBE: ['youtube.com', 'youtu.be'],
  LINKEDIN: ['linkedin.com'],
}

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  listSocial(workspaceId: string) {
    return this.prisma.integration.findMany({
      where: { workspaceId, provider: { in: socialProviders }, status: { not: IntegrationStatus.REVOKED } },
      select: {
        id: true, provider: true, status: true, externalAccountId: true, externalAccountName: true,
        settings: true, lastSyncedAt: true, lastError: true, createdAt: true, updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async connectSocial(workspaceId: string, actorId: string, dto: ConnectSocialDto) {
    if (!socialProviders.includes(dto.provider)) throw new BadRequestException('Nền tảng này không phải một kênh social được hềEtrợ.')
    const pageUrl = this.validateProviderUrl(dto.provider, dto.pageUrl)
    const current = await this.prisma.integration.findFirst({ where: { workspaceId, provider: dto.provider } })
    const data = {
      externalAccountId: this.accountId(pageUrl),
      externalAccountName: dto.accountName.trim(),
      status: IntegrationStatus.CONNECTED,
      settings: { publicPageUrl: pageUrl, connectionMode: 'PUBLIC_PAGE' } as Prisma.InputJsonValue,
      lastSyncedAt: new Date(),
      lastError: null,
      scopes: ['public_profile', 'public_content'],
    }
    const integration = current
      ? await this.prisma.integration.update({ where: { id: current.id }, data })
      : await this.prisma.integration.create({ data: { workspaceId, provider: dto.provider, ...data } })
    await this.audit(workspaceId, actorId, 'integration.social_connected', integration.id, { provider: dto.provider, pageUrl })
    return integration
  }

  async disconnectSocial(workspaceId: string, integrationId: string, actorId: string) {
    const current = await this.prisma.integration.findFirst({ where: { id: integrationId, workspaceId, provider: { in: socialProviders } } })
    if (!current) throw new NotFoundException('Không tìm thấy kết nối social trong workspace.')
    const integration = await this.prisma.integration.update({
      where: { id: integrationId },
      data: { status: IntegrationStatus.REVOKED, lastSyncedAt: null },
    })
    await this.audit(workspaceId, actorId, 'integration.social_disconnected', integration.id, { provider: integration.provider })
    return { id: integration.id, status: integration.status }
  }

  private validateProviderUrl(provider: IntegrationProvider, value: string) {
    const url = new URL(value.trim())
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase()
    const allowed = providerHosts[provider] || []
    if (!allowed.some(host => hostname === host || hostname.endsWith(`.${host}`))) {
      throw new BadRequestException(`URL không khớp với nền tảng ${provider}.`)
    }
    url.hash = ''
    url.search = ''
    return url.toString().replace(/\/$/, '')
  }

  private accountId(value: string) {
    const url = new URL(value)
    return `${url.hostname.replace(/^www\./, '')}${url.pathname}`.toLowerCase().replace(/\/$/, '').slice(0, 190)
  }

  private audit(workspaceId: string, actorId: string, action: string, entityId: string, metadata: Prisma.InputJsonValue) {
    return this.prisma.auditLog.create({ data: { workspaceId, actorId, action, entityType: 'Integration', entityId, metadata } })
  }
}
