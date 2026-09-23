import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { WorkspaceAccessGuard } from '../common/guards/workspace-access.guard'
import { FacebookOAuthController } from './facebook-oauth.controller'
import { IntegrationsController } from './integrations.controller'
import { IntegrationsService } from './integrations.service'
import { IntegrationTokenService } from './integration-token.service'

@Module({
  imports: [AuthModule],
  controllers: [IntegrationsController, FacebookOAuthController],
  providers: [IntegrationsService, IntegrationTokenService, WorkspaceAccessGuard],
  exports: [IntegrationsService, IntegrationTokenService],
})
export class IntegrationsModule {}
