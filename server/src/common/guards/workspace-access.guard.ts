import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { WorkspaceRole } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { WORKSPACE_ROLES_KEY } from '../decorators/workspace-roles.decorator'
import { AuthenticatedUser } from '../types/authenticated-user'

@Injectable()
export class WorkspaceAccessGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      user: AuthenticatedUser
      params: Record<string, string>
      membership?: { id: string; role: WorkspaceRole }
    }>()
    const workspaceId = request.params.workspaceId
    if (!workspaceId) throw new ForbiddenException('Workspace context is required')

    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: request.user.id, workspaceId } },
      select: { id: true, role: true },
    })
    if (!membership) throw new ForbiddenException('You do not have access to this workspace')

    const allowed = this.reflector.getAllAndOverride<WorkspaceRole[]>(WORKSPACE_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (allowed?.length && !allowed.includes(membership.role)) {
      throw new ForbiddenException('Your workspace role cannot perform this action')
    }

    request.membership = membership
    return true
  }
}
