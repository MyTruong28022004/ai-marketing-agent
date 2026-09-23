import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { WorkspaceRole } from '@prisma/client'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { WorkspaceRoles } from '../common/decorators/workspace-roles.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { WorkspaceAccessGuard } from '../common/guards/workspace-access.guard'
import { AuthenticatedUser } from '../common/types/authenticated-user'
import { ConnectSocialDto } from './dto/connect-social.dto'
import { ConnectFacebookManualDto } from './dto/connect-facebook-manual.dto'
import { FacebookAppConfigDto } from './dto/facebook-app-config.dto'
import { SelectFacebookPageDto } from './dto/select-facebook-page.dto'
import { IntegrationsService } from './integrations.service'

@Controller('workspaces/:workspaceId/integrations')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
@WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get('social')
  listSocial(@Param('workspaceId') workspaceId: string) {
    return this.integrations.listSocial(workspaceId)
  }

  @Get('facebook/app-config')
  getFacebookAppConfig(@Param('workspaceId') workspaceId: string) {
    return this.integrations.getFacebookAppConfig(workspaceId)
  }

  @Post('facebook/app-config')
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  saveFacebookAppConfig(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: FacebookAppConfigDto,
  ) {
    return this.integrations.saveFacebookAppConfig(workspaceId, user.id, dto)
  }

  @Post('facebook/manual')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  connectFacebookManually(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConnectFacebookManualDto,
  ) {
    return this.integrations.connectFacebookManually(workspaceId, user.id, dto)
  }

  @Post('facebook/oauth/start')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  startFacebookOAuth(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.integrations.startFacebookOAuth(workspaceId, user.id)
  }

  @Get('facebook/oauth/pending')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  listFacebookOAuthPending(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.integrations.listFacebookOAuthPending(workspaceId, user.id)
  }

  @Post('facebook/oauth/select')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  selectFacebookPage(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SelectFacebookPageDto,
  ) {
    return this.integrations.selectFacebookPage(workspaceId, user.id, dto)
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
