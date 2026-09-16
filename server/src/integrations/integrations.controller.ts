import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { WorkspaceRole } from '@prisma/client'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { WorkspaceRoles } from '../common/decorators/workspace-roles.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { WorkspaceAccessGuard } from '../common/guards/workspace-access.guard'
import { AuthenticatedUser } from '../common/types/authenticated-user'
import { ConnectSocialDto } from './dto/connect-social.dto'
import { IntegrationsService } from './integrations.service'

@Controller('workspaces/:workspaceId/integrations')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get('social')
  listSocial(@Param('workspaceId') workspaceId: string) {
    return this.integrations.listSocial(workspaceId)
  }

  @Post('social')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  connectSocial(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConnectSocialDto,
  ) {
    return this.integrations.connectSocial(workspaceId, user.id, dto)
  }

  @Delete('social/:integrationId')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  disconnectSocial(
    @Param('workspaceId') workspaceId: string,
    @Param('integrationId') integrationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.integrations.disconnectSocial(workspaceId, integrationId, user.id)
  }
}
