import { WorkspaceRole } from '@prisma/client'
import { IsIn } from 'class-validator'

export class UpdateMemberRoleDto {
  @IsIn([WorkspaceRole.MARKETER, WorkspaceRole.SALES])
  role: 'MARKETER' | 'SALES'
}
