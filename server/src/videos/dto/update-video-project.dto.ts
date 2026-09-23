import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'

export class UpdateVideoProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  voiceId?: string

  @IsOptional()
  @IsUUID()
  voiceProfileId?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(600)
  voiceInstructions?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tone?: string

  @IsOptional()
  @IsIn(['slow', 'balanced', 'fast'])
  pace?: string

  @IsOptional()
  @IsBoolean()
  captions?: boolean
}
