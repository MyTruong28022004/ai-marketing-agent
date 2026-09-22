import { Module } from '@nestjs/common'
import { WorkspaceAccessGuard } from '../common/guards/workspace-access.guard'
import { ChromaService } from './chroma.service'
import { EmbeddingService } from './embedding.service'
import { KnowledgeController } from './knowledge.controller'
import { KnowledgeIndexService } from './knowledge-index.service'
import { ProductsController } from './products.controller'
import { ProductsService } from './products.service'

@Module({
  controllers: [ProductsController, KnowledgeController],
  providers: [ProductsService, WorkspaceAccessGuard, ChromaService, EmbeddingService, KnowledgeIndexService],
  exports: [ChromaService, EmbeddingService],
})
export class ProductsModule {}
