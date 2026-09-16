import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Prisma, UserStatus, WorkspaceRole } from '@prisma/client'
import * as argon2 from 'argon2'
import { randomBytes, randomUUID } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

interface ClientContext {
  userAgent?: string
  ipAddress?: string
}

interface RefreshPayload {
  sub: string
  sessionId: string
  type: 'refresh'
}

@Injectable()
export class AuthService {
  private readonly accessSecret: string
  private readonly refreshSecret: string
  private readonly accessTtl: string
  private readonly refreshDays: number

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessSecret = config.getOrThrow<string>('JWT_ACCESS_SECRET')
    this.refreshSecret = config.getOrThrow<string>('JWT_REFRESH_SECRET')
    this.accessTtl = config.get<string>('ACCESS_TOKEN_TTL', '15m')
    this.refreshDays = config.get<number>('REFRESH_TOKEN_TTL_DAYS', 30)
  }

  async register(dto: RegisterDto, context: ClientContext) {
    const email = dto.email.trim().toLowerCase()
    const exists = await this.prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (exists) throw new ConflictException('Email is already registered')

    const passwordHash = await argon2.hash(dto.password)
    const suffix = randomBytes(3).toString('hex')
    const slug = `${this.slugify(dto.companyName)}-${suffix}`

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name: dto.name.trim(), passwordHash },
        select: { id: true, email: true, name: true },
      })
      const workspace = await tx.workspace.create({
        data: {
          name: dto.companyName.trim(),
          slug,
          createdById: user.id,
          companyProfile: { create: { legalName: dto.companyName.trim() } },
          memberships: { create: { userId: user.id, role: WorkspaceRole.ADMIN } },
        },
        select: { id: true, name: true, slug: true, onboardingStatus: true, onboardingStep: true },
      })
      await tx.auditLog.create({
        data: {
          workspaceId: workspace.id,
          actorId: user.id,
          action: 'workspace.created',
          entityType: 'Workspace',
          entityId: workspace.id,
          ipAddress: context.ipAddress,
        },
      })
      return { user, workspace }
    })

    return { ...result, ...(await this.issueSession(result.user, context)) }
  }

  async login(dto: LoginDto, context: ClientContext) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } })
    if (!user || user.status !== UserStatus.ACTIVE || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Email or password is incorrect')
    }

    const safeUser = { id: user.id, email: user.email, name: user.name }
    const workspaces = await this.prisma.membership.findMany({
      where: { userId: user.id },
      select: {
        role: true,
        workspace: { select: { id: true, name: true, slug: true, onboardingStatus: true, onboardingStep: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    return { user: safeUser, workspaces, ...(await this.issueSession(safeUser, context)) }
  }

  async refresh(refreshToken: string | undefined, context: ClientContext) {
    if (!refreshToken) throw new UnauthorizedException('Refresh token is missing')

    let payload: RefreshPayload
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, { secret: this.refreshSecret })
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired')
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Invalid token type')

    const session = await this.prisma.refreshSession.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    })
    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.status !== UserStatus.ACTIVE ||
      !(await argon2.verify(session.tokenHash, refreshToken))
    ) {
      throw new UnauthorizedException('Refresh session is no longer valid')
    }

    const tokens = await this.signTokens(session.user, session.id)
    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: {
        tokenHash: await argon2.hash(tokens.refreshToken),
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
      },
    })
    return { user: { id: session.user.id, email: session.user.email, name: session.user.name }, ...tokens }
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return
    try {
      const payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, { secret: this.refreshSecret })
      await this.prisma.refreshSession.updateMany({
        where: { id: payload.sessionId, userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    } catch {
      // Clearing an invalid or expired cookie is still a successful logout.
    }
  }

  private async issueSession(user: { id: string; email: string }, context: ClientContext) {
    const sessionId = randomUUID()
    const tokens = await this.signTokens(user, sessionId)
    const expiresAt = new Date(Date.now() + this.refreshDays * 24 * 60 * 60 * 1000)
    await this.prisma.refreshSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        tokenHash: await argon2.hash(tokens.refreshToken),
        expiresAt,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
      },
    })
    return tokens
  }

  private async signTokens(user: { id: string; email: string }, sessionId: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: user.id, email: user.email, type: 'access' },
        { secret: this.accessSecret, expiresIn: this.accessTtl as never },
      ),
      this.jwt.signAsync(
        { sub: user.id, sessionId, type: 'refresh' },
        { secret: this.refreshSecret, expiresIn: `${this.refreshDays}d` },
      ),
    ])
    return { accessToken, refreshToken }
  }

  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'workspace'
  }
}
