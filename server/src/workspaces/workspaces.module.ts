import { Module } from '@nestjs/common'
import { WorkspaceAccessGuard } from '../common/guards/workspace-access.guard'
import { WebsiteAnalysisService } from './website-analysis.service'
import { WorkspacesController } from './workspaces.controller'
import { WorkspacesService } from './workspaces.service'

@Module({
  controllers: [WorkspacesController],
  providers: [WorkspacesService, WebsiteAnalysisService, WorkspaceAccessGuard],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
