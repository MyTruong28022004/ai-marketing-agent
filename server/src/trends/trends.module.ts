import { Module } from '@nestjs/common'
import { WorkspaceAccessGuard } from '../common/guards/workspace-access.guard'
import { IntegrationsModule } from '../integrations/integrations.module'
import { ProductsModule } from '../products/products.module'
import { TrendsController } from './trends.controller'
import { TrendsService } from './trends.service'

@Module({
  imports: [ProductsModule, IntegrationsModule],
  controllers: [TrendsController],
  providers: [TrendsService, WorkspaceAccessGuard],
})
export class TrendsModule {}
