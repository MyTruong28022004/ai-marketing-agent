import { IntegrationProvider } from '@prisma/client'
import { IsEnum, IsString, IsUrl, Length } from 'class-validator'

export class ConnectSocialDto {
  @IsEnum(IntegrationProvider)
  provider: IntegrationProvider

  @IsUrl({ require_protocol: true, protocols: ['https'] })
  pageUrl: string

  @IsString()
  @Length(2, 120)
  accountName: string
}
