import { CompetitorType, MonitoringFrequency } from '@prisma/client'
import { IsBoolean, IsEnum, IsOptional, IsString, IsUrl, Length, ValidateIf } from 'class-validator'

export class UpdateCompetitorDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string

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
  @IsBoolean()
  active?: boolean

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUrl({ require_protocol: true })
  websiteUrl?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUrl({ require_protocol: true })
  facebookPageUrl?: string | null
}
