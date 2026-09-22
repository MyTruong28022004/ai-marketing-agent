import { ContentPostStatus } from '@prisma/client'
import { IsEnum } from 'class-validator'

export class UpdateContentPostStatusDto {
  @IsEnum(ContentPostStatus)
  status!: ContentPostStatus
}
