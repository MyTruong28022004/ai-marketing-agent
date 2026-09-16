import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InvitationStatus, OnboardingStatus, OnboardingStep, Prisma, WorkspaceRole } from '@prisma/client'
import { createHash, randomBytes } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { AuthenticatedUser } from '../common/types/authenticated-user'
import { CreateWorkspaceDto } from './dto/create-workspace.dto'
import { InviteMemberDto } from './dto/invite-member.dto'
import { UpdateOnboardingDto } from './dto/update-onboarding.dto'

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.membership.findMany({
      where: { userId },
      select: {
        role: true,
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            onboardingStatus: true,
            onboardingStep: true,
            companyProfile: { select: { industry: true, website: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async create(user: AuthenticatedUser, dto: CreateWorkspaceDto) {
    const workspace = await this.prisma.workspace.create({
      data: {
        name: dto.name.trim(),
        slug: `${this.slugify(dto.name)}-${randomBytes(3).toString('hex')}`,
        createdById: user.id,
        companyProfile: { create: { legalName: dto.name.trim() } },
        memberships: { create: { userId: user.id, role: WorkspaceRole.ADMIN } },
      },
      include: { companyProfile: true, memberships: { where: { userId: user.id } } },
    })
    await this.audit(workspace.id, user.id, 'workspace.created', 'Workspace', workspace.id)
    return workspace
  }

  getOverview(workspaceId: string) {
    return this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        slug: true,
        onboardingStatus: true,
        onboardingStep: true,
        companyProfile: true,
        _count: { select: { memberships: true, projects: true, competitors: true, opportunities: true } },
      },
    })
  }

  getMembers(workspaceId: string) {
    return this.prisma.membership.findMany({
      where: { workspaceId },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, status: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  getOnboarding(workspaceId: string) {
    return this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, onboardingStatus: true, onboardingStep: true, companyProfile: true },
    })
  }

  async updateOnboarding(workspaceId: string, userId: string, dto: UpdateOnboardingDto) {
    const profileData: Prisma.CompanyProfileUncheckedUpdateInput = {}
    const scalarKeys = [
      'legalName',
      'website',
      'country',
      'timezone',
      'language',
      'industry',
      'subIndustries',
      'businessModel',
      'description',
      'goals',
    ] as const
    for (const key of scalarKeys) {
      if (dto[key] !== undefined) Object.assign(profileData, { [key]: dto[key] })
    }
    if (dto.products !== undefined) profileData.products = dto.products as Prisma.InputJsonValue
    if (dto.audiences !== undefined) profileData.audiences = dto.audiences as Prisma.InputJsonValue
    if (dto.brandVoice !== undefined) profileData.brandVoice = dto.brandVoice as Prisma.InputJsonValue
    if (dto.onboardingData !== undefined) profileData.onboardingData = dto.onboardingData as Prisma.InputJsonValue

    const onboardingStep = dto.completed ? OnboardingStep.COMPLETE : dto.currentStep
    const onboardingStatus = dto.completed ? OnboardingStatus.COMPLETED : OnboardingStatus.IN_PROGRESS
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.companyProfile.upsert({
        where: { workspaceId },
        create: { workspaceId, ...profileData } as Prisma.CompanyProfileUncheckedCreateInput,
        update: profileData,
      })
      return tx.workspace.update({
        where: { id: workspaceId },
        data: { onboardingStatus, ...(onboardingStep ? { onboardingStep } : {}) },
        select: { id: true, name: true, onboardingStatus: true, onboardingStep: true, companyProfile: true },
      })
    })
    await this.audit(workspaceId, userId, 'onboarding.updated', 'Workspace', workspaceId, {
      step: result.onboardingStep,
      completed: dto.completed === true,
    })
    return result
  }

  async invite(workspaceId: string, invitedById: string, dto: InviteMemberDto) {
    const email = dto.email.trim().toLowerCase()
    const existingMember = await this.prisma.membership.findFirst({
      where: { workspaceId, user: { email } },
      select: { id: true },
    })
    if (existingMember) throw new ConflictException('This user is already a workspace member')

    await this.prisma.invitation.updateMany({
      where: { workspaceId, email, status: InvitationStatus.PENDING },
      data: { status: InvitationStatus.REVOKED },
    })
    const token = randomBytes(32).toString('base64url')
    const invitation = await this.prisma.invitation.create({
      data: {
        workspaceId,
        email,
        role: dto.role,
        tokenHash: this.hashToken(token),
        invitedById,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      select: { id: true, email: true, role: true, expiresAt: true },
    })
    await this.audit(workspaceId, invitedById, 'member.invited', 'Invitation', invitation.id, {
      email,
      role: dto.role,
    })
    return { ...invitation, token }
  }

  async acceptInvitation(token: string, user: AuthenticatedUser) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: this.hashToken(token) },
    })
    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new NotFoundException('Invitation is invalid or no longer available')
    }
    if (invitation.expiresAt <= new Date()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      })
      throw new BadRequestException('Invitation has expired')
    }
    if (invitation.email !== user.email.toLowerCase()) {
      throw new BadRequestException('Invitation was issued for another email address')
    }

    await this.prisma.$transaction([
      this.prisma.membership.upsert({
        where: { userId_workspaceId: { userId: user.id, workspaceId: invitation.workspaceId } },
        create: { userId: user.id, workspaceId: invitation.workspaceId, role: invitation.role },
        update: { role: invitation.role },
      }),
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() },
      }),
    ])
    await this.audit(invitation.workspaceId, user.id, 'member.joined', 'Membership')
    return { workspaceId: invitation.workspaceId, role: invitation.role }
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
  }

  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'workspace'
  }

  private audit(
    workspaceId: string,
    actorId: string,
    action: string,
    entityType: string,
    entityId?: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.auditLog.create({
      data: { workspaceId, actorId, action, entityType, entityId, metadata },
    })
  }
}
