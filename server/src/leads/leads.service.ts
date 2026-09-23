import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { LeadStatus, Prisma, WorkspaceRole } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateLeadDto } from './dto/create-lead.dto'
import { UpdateLeadDto } from './dto/update-lead.dto'

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string) {
    const leads = await this.prisma.lead.findMany({
      where: { workspaceId },
      include: { assignedTo: { select: { id: true, name: true, email: true } }, createdBy: { select: { id: true, name: true } } },
      orderBy: [{ updatedAt: 'desc' }],
    })
    const pipeline = Object.values(LeadStatus).map(status => ({
      status,
      count: leads.filter(lead => lead.status === status).length,
      value: leads.filter(lead => lead.status === status).reduce((sum, lead) => sum + (lead.valueCents || 0), 0),
    }))
    return { leads, pipeline, total: leads.length, wonValue: pipeline.find(item => item.status === LeadStatus.WON)?.value || 0 }
  }

  async create(workspaceId: string, actorId: string, dto: CreateLeadDto) {
    if (dto.assignedToId) await this.assertSalesMember(workspaceId, dto.assignedToId)
    const lead = await this.prisma.lead.create({
      data: {
        workspaceId,
        createdById: actorId,
        ...this.clean(dto),
        name: dto.name.trim(),
      },
      include: { assignedTo: { select: { id: true, name: true, email: true } }, createdBy: { select: { id: true, name: true } } },
    })
    await this.audit(workspaceId, actorId, 'lead.created', lead.id, { status: lead.status })
    return lead
  }

  async update(workspaceId: string, leadId: string, actorId: string, dto: UpdateLeadDto) {
    await this.find(workspaceId, leadId)
    if (dto.assignedToId) await this.assertSalesMember(workspaceId, dto.assignedToId)
    const lead = await this.prisma.lead.update({
      where: { id: leadId },
      data: this.clean(dto) as Prisma.LeadUncheckedUpdateInput,
      include: { assignedTo: { select: { id: true, name: true, email: true } }, createdBy: { select: { id: true, name: true } } },
    })
    await this.audit(workspaceId, actorId, 'lead.updated', lead.id, { status: lead.status })
    return lead
  }

  async remove(workspaceId: string, leadId: string, actorId: string) {
    await this.find(workspaceId, leadId)
    await this.prisma.lead.delete({ where: { id: leadId } })
    await this.audit(workspaceId, actorId, 'lead.deleted', leadId)
  }

  private async find(workspaceId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, workspaceId } })
    if (!lead) throw new NotFoundException('Không tìm thấy lead')
    return lead
  }

  private async assertSalesMember(workspaceId: string, userId: string) {
    const member = await this.prisma.membership.findUnique({ where: { userId_workspaceId: { userId, workspaceId } } })
    if (!member || (member.role !== WorkspaceRole.ADMIN && member.role !== WorkspaceRole.SALES)) {
      throw new BadRequestException('Lead chỉ có thể giao cho thành viên Sales hoặc Admin')
    }
  }

  private clean(dto: CreateLeadDto | UpdateLeadDto): {
    name?: string | null
    email?: string | null
    phone?: string | null
    company?: string | null
    source?: string | null
    status?: LeadStatus
    score?: number
    valueCents?: number
    assignedToId?: string | null
    notes?: string | null
  } {
    const result: Record<string, unknown> = {}
    for (const key of ['name', 'email', 'phone', 'company', 'source', 'status', 'score', 'valueCents', 'assignedToId', 'notes'] as const) {
      const value = dto[key]
      if (value !== undefined) result[key] = typeof value === 'string' ? value.trim() || null : value
    }
    return result
  }

  private audit(workspaceId: string, actorId: string, action: string, entityId: string, metadata?: Prisma.InputJsonValue) {
    return this.prisma.auditLog.create({ data: { workspaceId, actorId, action, entityType: 'Lead', entityId, metadata } })
  }
}
