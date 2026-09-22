import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { IntegrationProvider, IntegrationStatus, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { ConnectFacebookManualDto } from './dto/connect-facebook-manual.dto'
import { FacebookAppConfigDto } from './dto/facebook-app-config.dto'
import { ConnectSocialDto } from './dto/connect-social.dto'
import { SelectFacebookPageDto } from './dto/select-facebook-page.dto'
import { IntegrationTokenService } from './integration-token.service'

type FacebookOAuthState = {
  sub: string
  workspaceId: string
  appConfigId?: string
  purpose: 'facebook_oauth'
}

type FacebookAppCredentials = {
  id?: string
  appId: string
  appSecret: string
  loginConfigId: string
  source: 'WORKSPACE'
}

type FacebookPage = {
  id: string
  name: string
  access_token: string
  tasks?: string[]
}

const socialProviders: IntegrationProvider[] = [
  IntegrationProvider.FACEBOOK,
  IntegrationProvider.INSTAGRAM,
  IntegrationProvider.TIKTOK,
  IntegrationProvider.YOUTUBE,
  IntegrationProvider.LINKEDIN,
]

const facebookPublishTasks = new Set(['PROFILE_PLUS_CREATE_CONTENT', 'CREATE_CONTENT'])

const providerHosts: Record<string, string[]> = {
  FACEBOOK: ['facebook.com', 'fb.com'],
  INSTAGRAM: ['instagram.com'],
  TIKTOK: ['tiktok.com'],
  YOUTUBE: ['youtube.com', 'youtu.be'],
  LINKEDIN: ['linkedin.com'],
}

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly tokens: IntegrationTokenService,
    private readonly config: ConfigService,
  ) {}

  async listSocial(workspaceId: string) {
    const integrations = await this.prisma.integration.findMany({
      where: { workspaceId, provider: { in: socialProviders }, status: { not: IntegrationStatus.REVOKED } },
      select: {
        id: true, provider: true, status: true, externalAccountId: true, externalAccountName: true,
        settings: true, lastSyncedAt: true, lastError: true, createdAt: true, updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })
    return integrations.map(({ settings, ...integration }) => {
      const values = settings && typeof settings === 'object' && !Array.isArray(settings)
        ? settings as Record<string, unknown>
        : {}
      return {
        ...integration,
        publicPageUrl: typeof values.publicPageUrl === 'string' ? values.publicPageUrl : null,
        connectionMode: typeof values.connectionMode === 'string' ? values.connectionMode : 'PUBLIC_PAGE',
      }
    })
  }

  async getFacebookAppConfig(workspaceId: string) {
    const config = await this.prisma.facebookAppConfig.findUnique({
      where: { workspaceId },
      select: { id: true, appId: true, loginConfigId: true, updatedAt: true },
    })
    if (config) {
      return { configured: true, source: 'WORKSPACE', appId: config.appId, loginConfigId: config.loginConfigId, updatedAt: config.updatedAt }
    }
    return {
      configured: false,
      source: 'WORKSPACE',
      appId: null,
      loginConfigId: null,
      updatedAt: null,
    }
  }

  async saveFacebookAppConfig(workspaceId: string, actorId: string, dto: FacebookAppConfigDto) {
    const appId = dto.appId.trim()
    const loginConfigId = dto.loginConfigId.trim()
    const encryptedAppSecret = this.tokens.encrypt(dto.appSecret.trim())
    const config = await this.prisma.facebookAppConfig.upsert({
      where: { workspaceId },
      update: { appId, encryptedAppSecret, loginConfigId },
      create: { workspaceId, appId, encryptedAppSecret, loginConfigId },
      select: { id: true, appId: true, loginConfigId: true, updatedAt: true },
    })
    await this.audit(workspaceId, actorId, 'facebook.app_config_updated', config.id, {
      provider: IntegrationProvider.FACEBOOK,
      appId,
      loginConfigId,
    })
    return { configured: true, source: 'WORKSPACE', ...config }
  }

  async startFacebookOAuth(workspaceId: string, actorId: string) {
    const appConfig = await this.facebookAppCredentials(workspaceId)
    const redirectUri = this.facebookRedirectUri()
    if (!appConfig.appId || !appConfig.loginConfigId || !redirectUri) {
      throw new ServiceUnavailableException('Chưa cấu hình Facebook App ID, Login Configuration ID và Redirect URI.')
    }

    const state = await this.jwt.signAsync({ sub: actorId, workspaceId, appConfigId: appConfig.id, purpose: 'facebook_oauth' } satisfies FacebookOAuthState, { expiresIn: '10m' })
    const graphVersion = this.graphVersion()
    const url = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`)
    url.searchParams.set('client_id', appConfig.appId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('state', state)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('config_id', appConfig.loginConfigId)
    url.searchParams.set('override_default_response_type', 'true')
    return { authUrl: url.toString() }
  }

  async handleFacebookOAuthCallback(code?: string, state?: string, error?: string, _errorDescription?: string) {
    let workspaceId = ''
    if (state) {
      try {
        const payload = await this.jwt.verifyAsync<FacebookOAuthState>(state)
        if (payload.purpose !== 'facebook_oauth') throw new Error('Invalid OAuth purpose')
        workspaceId = payload.workspaceId
        if (error || !code) return this.oauthRedirect(workspaceId, 'error')

        const appConfig = await this.facebookAppCredentials(workspaceId, payload.appConfigId)
        const redirectUri = this.facebookRedirectUri()
        const graphVersion = this.graphVersion()
        const tokenUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`)
        tokenUrl.searchParams.set('client_id', appConfig.appId)
        tokenUrl.searchParams.set('client_secret', appConfig.appSecret)
        tokenUrl.searchParams.set('redirect_uri', redirectUri)
        tokenUrl.searchParams.set('code', code)
        const tokenResponse = await fetch(tokenUrl)
        const tokenPayload = await tokenResponse.json() as { access_token?: string; error?: { message?: string } }
        if (!tokenResponse.ok || !tokenPayload.access_token) throw new Error(tokenPayload.error?.message || 'Facebook không trả về user access token')

        const pagesUrl = new URL(`https://graph.facebook.com/${graphVersion}/me/accounts`)
        pagesUrl.searchParams.set('fields', 'id,name,access_token,tasks')
        pagesUrl.searchParams.set('access_token', tokenPayload.access_token)
        const pagesResponse = await fetch(pagesUrl)
        const pagesPayload = await pagesResponse.json() as { data?: FacebookPage[]; error?: { message?: string } }
        if (!pagesResponse.ok) throw new Error(pagesPayload.error?.message || 'Không thể lấy danh sách Fanpage')
        const pages = (pagesPayload.data || []).filter(page => page.id && page.name && page.access_token)
        if (!pages.length) throw new Error('Tài khoản Facebook chưa quản lý Fanpage nào hoặc chưa cấp quyền cần thiết.')

        await Promise.all(pages.map(async page => {
          const existing = await this.prisma.integration.findFirst({
            where: { workspaceId, provider: IntegrationProvider.FACEBOOK, externalAccountId: page.id },
            select: { id: true },
          })
          const settings = {
            publicPageUrl: `https://facebook.com/${page.id}`,
            connectionMode: 'OAUTH_PENDING',
            pageId: page.id,
            oauthUserId: payload.sub,
          } as Prisma.InputJsonValue
          const data = {
            externalAccountId: page.id,
            externalAccountName: page.name.trim().slice(0, 190),
            encryptedAccessToken: this.tokens.encrypt(page.access_token),
            status: IntegrationStatus.PENDING,
            settings,
            scopes: Array.isArray(page.tasks) ? page.tasks : [],
            lastSyncedAt: new Date(),
            lastError: null,
          }
          if (existing) await this.prisma.integration.update({ where: { id: existing.id }, data })
          else await this.prisma.integration.create({ data: { workspaceId, provider: IntegrationProvider.FACEBOOK, ...data } })
        }))
        return this.oauthRedirect(workspaceId, 'select')
      } catch {
        return this.oauthRedirect(workspaceId, 'error')
      }
    }
    return this.oauthRedirect(workspaceId, 'error')
  }

  async listFacebookOAuthPending(workspaceId: string, actorId: string) {
    const integrations = await this.prisma.integration.findMany({
      where: { workspaceId, provider: IntegrationProvider.FACEBOOK, status: IntegrationStatus.PENDING },
      select: { id: true, externalAccountId: true, externalAccountName: true, scopes: true, settings: true },
      orderBy: { externalAccountName: 'asc' },
    })
    return integrations.flatMap(integration => {
      const values = integration.settings && typeof integration.settings === 'object' && !Array.isArray(integration.settings)
        ? integration.settings as Record<string, unknown>
        : {}
      if (values.oauthUserId !== actorId) return []
      return [{
        id: integration.id,
        pageId: integration.externalAccountId,
        pageName: integration.externalAccountName,
        publicPageUrl: typeof values.publicPageUrl === 'string' ? values.publicPageUrl : null,
        tasks: integration.scopes,
        canPublish: integration.scopes.length === 0 || integration.scopes.some(task => facebookPublishTasks.has(task)),
      }]
    })
  }

  async selectFacebookPage(workspaceId: string, actorId: string, dto: SelectFacebookPageDto) {
    const pending = await this.prisma.integration.findFirst({
      where: { id: dto.integrationId, workspaceId, provider: IntegrationProvider.FACEBOOK, status: IntegrationStatus.PENDING },
      select: { id: true, externalAccountId: true, externalAccountName: true, encryptedAccessToken: true, scopes: true, settings: true },
    })
    if (!pending) throw new NotFoundException('Không tìm thấy Fanpage Facebook đang chờ chọn.')
    const values = pending.settings && typeof pending.settings === 'object' && !Array.isArray(pending.settings)
      ? pending.settings as Record<string, unknown>
      : {}
    if (values.oauthUserId !== actorId) throw new ForbiddenException('Bạn không phải người khởi tạo kết nối Fanpage này.')
    if (pending.scopes.length && !pending.scopes.some(task => facebookPublishTasks.has(task))) {
      throw new BadRequestException('Tài khoản Facebook chưa có quyền tạo nội dung cho Fanpage này.')
    }
    if (!pending.encryptedAccessToken) throw new BadRequestException('Fanpage chưa có Page Access Token.')

    await this.prisma.integration.update({
      where: { id: pending.id },
      data: {
        status: IntegrationStatus.CONNECTED,
        settings: {
          publicPageUrl: typeof values.publicPageUrl === 'string' ? values.publicPageUrl : `https://facebook.com/${pending.externalAccountId}`,
          connectionMode: 'OAUTH',
          pageId: pending.externalAccountId,
        } as Prisma.InputJsonValue,
        lastSyncedAt: new Date(),
        lastError: null,
      },
    })
    return { id: pending.id, provider: IntegrationProvider.FACEBOOK, status: IntegrationStatus.CONNECTED, pageId: pending.externalAccountId, pageName: pending.externalAccountName }
  }

  async connectSocial(workspaceId: string, actorId: string, dto: ConnectSocialDto) {
    if (!socialProviders.includes(dto.provider)) throw new BadRequestException('Nền tảng này không phải một kênh social được hềEtrợ.')
    const pageUrl = this.validateProviderUrl(dto.provider, dto.pageUrl)
    const externalAccountId = this.accountId(pageUrl)
    const current = await this.prisma.integration.findFirst({ where: { workspaceId, provider: dto.provider, externalAccountId } })
    const data = {
      externalAccountId,
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

  async connectFacebookManually(workspaceId: string, actorId: string, dto: ConnectFacebookManualDto) {
    const pageId = dto.pageId.trim()
    const pageAccessToken = dto.pageAccessToken.trim()
    const graphVersion = this.graphVersion()
    const verifyUrl = new URL(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(pageId)}`)
    verifyUrl.searchParams.set('fields', 'id,name')
    verifyUrl.searchParams.set('access_token', pageAccessToken)

    let verifiedPageName = ''
    try {
      const response = await fetch(verifyUrl)
      const payload = await response.json() as { id?: string; name?: string; error?: { message?: string } }
      if (!response.ok || payload.id !== pageId) {
        throw new Error(payload.error?.message || 'Facebook không xác thực được Page ID hoặc Page Access Token.')
      }
      verifiedPageName = payload.name?.trim() || ''
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Page ID hoặc Page Access Token không hợp lệ.')
    }

    const current = await this.prisma.integration.findFirst({
      where: { workspaceId, provider: IntegrationProvider.FACEBOOK, externalAccountId: pageId },
      select: { id: true },
    })
    const settings = {
      publicPageUrl: `https://facebook.com/${pageId}`,
      connectionMode: 'MANUAL',
      pageId,
    } as Prisma.InputJsonValue
    const data = {
      externalAccountId: pageId,
      externalAccountName: (dto.pageName?.trim() || verifiedPageName || `Facebook Page ${pageId}`).slice(0, 190),
      encryptedAccessToken: this.tokens.encrypt(pageAccessToken),
      status: IntegrationStatus.CONNECTED,
      settings,
      scopes: ['pages_manage_posts'],
      lastSyncedAt: new Date(),
      lastError: null,
    }

    const integration = current
      ? await this.prisma.integration.update({ where: { id: current.id }, data })
      : await this.prisma.integration.create({ data: { workspaceId, provider: IntegrationProvider.FACEBOOK, ...data } })
    await this.audit(workspaceId, actorId, 'integration.facebook_connected', integration.id, { provider: IntegrationProvider.FACEBOOK, pageId })
    return {
      id: integration.id,
      provider: integration.provider,
      status: integration.status,
      pageId: integration.externalAccountId,
      pageName: integration.externalAccountName,
      connectionMode: 'MANUAL',
    }
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

  private graphVersion() {
    return this.config.get<string>('FACEBOOK_GRAPH_VERSION', 'v25.0')
  }

  private async facebookAppCredentials(workspaceId: string, appConfigId?: string): Promise<FacebookAppCredentials> {
    const config = await this.prisma.facebookAppConfig.findFirst({
      where: appConfigId ? { id: appConfigId, workspaceId } : { workspaceId },
      select: { id: true, appId: true, encryptedAppSecret: true, loginConfigId: true },
    })
    if (config) {
      try {
        return {
          id: config.id,
          appId: config.appId,
          appSecret: this.tokens.decrypt(config.encryptedAppSecret),
          loginConfigId: config.loginConfigId,
          source: 'WORKSPACE',
        }
      } catch {
        throw new ServiceUnavailableException('Facebook App Secret của workspace không thể giải mã. Hãy lưu lại cấu hình Facebook App.')
      }
    }

    throw new ServiceUnavailableException('Workspace Facebook App config is required.')
    /* Legacy environment fallback intentionally removed; configure Facebook per workspace.
    const appSecret = ''
    const loginConfigId = ''
    if (!appId || !appSecret || !loginConfigId) {
      throw new ServiceUnavailableException('Workspace chưa cấu hình Facebook App ID, App Secret và Login Configuration ID.')
    }
    */
  }

  private facebookRedirectUri() {
    return this.config.get<string>('FACEBOOK_REDIRECT_URI') || `${this.config.getOrThrow<string>('WEB_ORIGIN')}/api/integrations/facebook/callback`
  }

  private oauthRedirect(workspaceId: string, status: 'select' | 'error') {
    const url = new URL('/competitors', this.config.getOrThrow<string>('WEB_ORIGIN'))
    url.searchParams.set('tab', 'social')
    if (workspaceId) url.searchParams.set('workspaceId', workspaceId)
    url.searchParams.set('facebook', status)
    return url.toString()
  }

  private accountId(value: string) {
    const url = new URL(value)
    return `${url.hostname.replace(/^www\./, '')}${url.pathname}`.toLowerCase().replace(/\/$/, '').slice(0, 190)
  }

  private audit(workspaceId: string, actorId: string, action: string, entityId: string, metadata: Prisma.InputJsonValue) {
    return this.prisma.auditLog.create({ data: { workspaceId, actorId, action, entityType: 'Integration', entityId, metadata } })
  }
}
