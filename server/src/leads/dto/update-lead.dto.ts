import { LeadStatus } from '@prisma/client'
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator'

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  company?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  valueCents?: number

  @IsOptional()
  @IsUUID()
  assignedToId?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string
}
