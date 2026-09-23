import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { WorkspaceRole } from '@prisma/client'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { WorkspaceRoles } from '../common/decorators/workspace-roles.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { WorkspaceAccessGuard } from '../common/guards/workspace-access.guard'
import { AuthenticatedUser } from '../common/types/authenticated-user'
import { CreateLeadDto } from './dto/create-lead.dto'
import { UpdateLeadDto } from './dto/update-lead.dto'
import { LeadsService } from './leads.service'

@Controller('workspaces/:workspaceId/leads')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
@WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.SALES)
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  list(@Param('workspaceId') workspaceId: string) { return this.leads.list(workspaceId) }

  @Post()
  create(@Param('workspaceId') workspaceId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLeadDto) {
    return this.leads.create(workspaceId, user.id, dto)
  }

  @Patch(':leadId')
  update(@Param('workspaceId') workspaceId: string, @Param('leadId') leadId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateLeadDto) {
    return this.leads.update(workspaceId, leadId, user.id, dto)
  }

  @Delete(':leadId')
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  @HttpCode(204)
  remove(@Param('workspaceId') workspaceId: string, @Param('leadId') leadId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.leads.remove(workspaceId, leadId, user.id)
  }
}
