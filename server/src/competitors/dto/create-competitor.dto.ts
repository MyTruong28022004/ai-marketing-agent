import { CompetitorType, MonitoringFrequency } from '@prisma/client'
import { IsEnum, IsOptional, IsString, IsUrl, Length } from 'class-validator'

export class CreateCompetitorDto {
  @IsString()
  @Length(2, 120)
  name: string

  @IsOptional()
  @IsEnum(CompetitorType)
  type?: CompetitorType

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string

  @IsOptional()
  @IsEnum(MonitoringFrequency)
  frequency?: MonitoringFrequency

  @IsOptional()
  @IsUrl({ require_protocol: true })
  websiteUrl?: string

  @IsOptional()
  @IsUrl({ require_protocol: true })
  facebookPageUrl?: string
}
