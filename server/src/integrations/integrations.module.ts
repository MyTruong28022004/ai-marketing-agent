import { Module } from '@nestjs/common'
import { WorkspaceAccessGuard } from '../common/guards/workspace-access.guard'
import { IntegrationsController } from './integrations.controller'
import { IntegrationsService } from './integrations.service'

@Module({
  controllers: [IntegrationsController],
  providers: [IntegrationsService, WorkspaceAccessGuard],
})
export class IntegrationsModule {}
