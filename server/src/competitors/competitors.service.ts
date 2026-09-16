import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { CompetitorSourceType, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCompetitorDto } from './dto/create-competitor.dto'
import { UpdateCompetitorDto } from './dto/update-competitor.dto'

@Injectable()
export class CompetitorsService {
  constructor(private readonly prisma: PrismaService) {}

  list(workspaceId: string) {
    return this.prisma.competitor.findMany({
      where: { workspaceId },
      include: {
        sources: true,
        _count: { select: { snapshots: true, opportunities: true } },
      },
      orderBy: [{ active: 'desc' }, { threatScore: 'desc' }, { createdAt: 'asc' }],
    })
  }

  async get(workspaceId: string, competitorId: string) {
    const competitor = await this.prisma.competitor.findFirst({
      where: { id: competitorId, workspaceId },
      include: {
        sources: true,
        snapshots: { orderBy: { capturedAt: 'desc' }, take: 20 },
        opportunities: { orderBy: { score: 'desc' }, take: 20 },
      },
    })
    if (!competitor) throw new NotFoundException('Competitor was not found in this workspace')
    return competitor
  }

  async create(workspaceId: string, actorId: string, dto: CreateCompetitorDto) {
    if (!dto.websiteUrl && !dto.facebookPageUrl) {
      throw new BadRequestException('At least one website or Facebook Page URL is required')
    }
    const activeCount = await this.prisma.competitor.count({ where: { workspaceId, active: true } })
    if (activeCount >= 10) throw new BadRequestException('Workspace chỉ có thể theo dõi tối đa 10 đối thủ đang hoạt động.')
    const duplicate = await this.prisma.competitor.findFirst({
      where: { workspaceId, name: { equals: dto.name.trim(), mode: 'insensitive' } },
      select: { id: true },
    })
    if (duplicate) throw new ConflictException('Tên đối thủ đã tồn tại trong workspace.')
    const sources: Prisma.CompetitorSourceCreateWithoutCompetitorInput[] = []
    if (dto.websiteUrl) {
      sources.push({ type: CompetitorSourceType.WEBSITE, url: this.normalizeUrl(dto.websiteUrl) })
    }
    if (dto.facebookPageUrl) {
      sources.push({ type: CompetitorSourceType.FACEBOOK_PAGE, url: this.normalizeUrl(dto.facebookPageUrl) })
      sources.push({ type: CompetitorSourceType.META_AD_LIBRARY, url: this.metaAdLibraryUrl(dto.facebookPageUrl) })
    }

    const competitor = await this.prisma.competitor.create({
      data: {
        workspaceId,
        name: dto.name.trim(),
        type: dto.type,
        description: dto.description?.trim(),
        frequency: dto.frequency,
        sources: { create: sources },
      },
      include: { sources: true },
    })
    await this.audit(workspaceId, actorId, 'competitor.created', competitor.id, { name: competitor.name })
    return competitor
  }

  async update(workspaceId: string, competitorId: string, actorId: string, dto: UpdateCompetitorDto) {
    const current = await this.ensureExists(workspaceId, competitorId)
    if (dto.active === true && !current.active) {
      const activeCount = await this.prisma.competitor.count({ where: { workspaceId, active: true } })
      if (activeCount >= 10) throw new BadRequestException('Workspace chỉ có thể theo dõi tối đa 10 đối thủ đang hoạt động.')
    }
    if (dto.name !== undefined) {
      const duplicate = await this.prisma.competitor.findFirst({
        where: { workspaceId, id: { not: competitorId }, name: { equals: dto.name.trim(), mode: 'insensitive' } },
        select: { id: true },
      })
      if (duplicate) throw new ConflictException('Tên đối thủ đã tồn tại trong workspace.')
    }

    const websiteUrl = dto.websiteUrl === undefined
      ? current.sources.find(source => source.type === CompetitorSourceType.WEBSITE)?.url
      : dto.websiteUrl ? this.normalizeUrl(dto.websiteUrl) : undefined
    const facebookPageUrl = dto.facebookPageUrl === undefined
      ? current.sources.find(source => source.type === CompetitorSourceType.FACEBOOK_PAGE)?.url
      : dto.facebookPageUrl ? this.normalizeUrl(dto.facebookPageUrl) : undefined
    const sourceChanged = dto.websiteUrl !== undefined || dto.facebookPageUrl !== undefined
    if (sourceChanged && !websiteUrl && !facebookPageUrl) {
      throw new BadRequestException('At least one website or Facebook Page URL is required')
    }

    const competitor = await this.prisma.$transaction(async tx => {
      if (sourceChanged) {
        await tx.competitorSource.deleteMany({ where: { competitorId } })
      }
      return tx.competitor.update({
        where: { id: competitorId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
          ...(dto.frequency !== undefined ? { frequency: dto.frequency } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
          ...(sourceChanged ? { sources: { create: [
            ...(websiteUrl ? [{ type: CompetitorSourceType.WEBSITE, url: websiteUrl }] : []),
            ...(facebookPageUrl ? [
              { type: CompetitorSourceType.FACEBOOK_PAGE, url: facebookPageUrl },
              { type: CompetitorSourceType.META_AD_LIBRARY, url: this.metaAdLibraryUrl(facebookPageUrl) },
            ] : []),
          ] } } : {}),
        },
        include: { sources: true },
      })
    })
    await this.audit(workspaceId, actorId, 'competitor.updated', competitor.id, dto as Prisma.InputJsonValue)
    return competitor
  }

  async deactivate(workspaceId: string, competitorId: string, actorId: string) {
    await this.ensureExists(workspaceId, competitorId)
    const competitor = await this.prisma.competitor.update({
      where: { id: competitorId },
      data: { active: false },
      select: { id: true, name: true, active: true },
    })
    await this.audit(workspaceId, actorId, 'competitor.deactivated', competitor.id)
    return competitor
  }

  private async ensureExists(workspaceId: string, competitorId: string) {
    const competitor = await this.prisma.competitor.findFirst({
      where: { id: competitorId, workspaceId },
      include: { sources: true },
    })
    if (!competitor) throw new NotFoundException('Competitor was not found in this workspace')
    return competitor
  }

  private normalizeUrl(value: string) {
    const url = new URL(value)
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  }

  private metaAdLibraryUrl(facebookPageUrl: string) {
    const page = new URL(facebookPageUrl).pathname.split('/').filter(Boolean)[0] ?? ''
    return `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&q=${encodeURIComponent(page)}`
  }

  private audit(
    workspaceId: string,
    actorId: string,
    action: string,
    entityId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.auditLog.create({
      data: { workspaceId, actorId, action, entityType: 'Competitor', entityId, metadata },
    })
  }
}
