import { Module } from '@nestjs/common'
import { WorkspaceAccessGuard } from '../common/guards/workspace-access.guard'
import { CompetitorsController } from './competitors.controller'
import { CompetitorDiscoveryService } from './competitor-discovery.service'
import { CompetitorIntelligenceService } from './competitor-intelligence.service'
import { CompetitorsService } from './competitors.service'

@Module({
  controllers: [CompetitorsController],
  providers: [CompetitorsService, CompetitorDiscoveryService, CompetitorIntelligenceService, WorkspaceAccessGuard],
})
export class CompetitorsModule {}
