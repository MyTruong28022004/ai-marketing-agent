import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common'
import { WorkspaceRole } from '@prisma/client'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { WorkspaceRoles } from '../common/decorators/workspace-roles.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { WorkspaceAccessGuard } from '../common/guards/workspace-access.guard'
import { AuthenticatedUser } from '../common/types/authenticated-user'
import { SearchKnowledgeDto } from './dto/search-knowledge.dto'
import { KnowledgeIndexService } from './knowledge-index.service'

@Controller('workspaces/:workspaceId/knowledge')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeIndexService) {}

  @Post('search')
  search(@Param('workspaceId') workspaceId: string, @Body() dto: SearchKnowledgeDto) {
    return this.knowledge.search(workspaceId, dto.query.trim(), dto.topK, dto.productId)
  }

  @Post('reindex')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  reindex(@Param('workspaceId') workspaceId: string, @CurrentUser() _user: AuthenticatedUser) {
    return this.knowledge.reindexWorkspace(workspaceId)
  }
}
