import { IsOptional, IsUUID } from 'class-validator'

export class PublishFacebookPostDto {
  @IsOptional()
  @IsUUID('4')
  integrationId?: string
}
