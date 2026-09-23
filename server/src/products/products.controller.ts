import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import { WorkspaceRole } from '@prisma/client'
import { FastifyRequest } from 'fastify'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { WorkspaceRoles } from '../common/decorators/workspace-roles.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { WorkspaceAccessGuard } from '../common/guards/workspace-access.guard'
import { AuthenticatedUser } from '../common/types/authenticated-user'
import { CreateProductDto } from './dto/create-product.dto'
import { ProductsService } from './products.service'

type MultipartRequest = FastifyRequest & {
  file?: () => Promise<{
    filename: string
    mimetype: string
    toBuffer: () => Promise<Buffer>
  } | undefined>
}

@Controller('workspaces/:workspaceId/products')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Param('workspaceId') workspaceId: string) {
    return this.products.list(workspaceId)
  }

  @Post()
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductDto,
  ) {
    return this.products.create(workspaceId, user.id, dto)
  }

  @Post(':productId/documents')
  @WorkspaceRoles(WorkspaceRole.MARKETER, WorkspaceRole.ADMIN)
  async uploadDocument(
    @Param('workspaceId') workspaceId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: FastifyRequest,
  ) {
    const multipartRequest = request as MultipartRequest
    if (!multipartRequest.file) throw new BadRequestException('Multipart upload chưa được bật trên server.')
    const file = await multipartRequest.file()
    if (!file) throw new BadRequestException('Vui lòng chọn file TXT hoặc PDF.')
    return this.products.uploadDocument(workspaceId, productId, user.id, file)
  }
}
