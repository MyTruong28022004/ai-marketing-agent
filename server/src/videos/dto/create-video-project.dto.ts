import { Type } from 'class-transformer'
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator'

export class CreateVideoProjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title: string

  @IsString()
  @MinLength(20)
  @MaxLength(12_000)
  script: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  channel?: string

  @IsIn(['9:16', '1:1', '16:9'])
  ratio: string

  @IsString()
  @MaxLength(80)
  tone: string

  @IsIn(['editorial', 'cinematic', 'product', 'ugc', 'minimal'])
  visualStyle: string

  @IsIn(['slow', 'balanced', 'fast'])
  pace: string

  @IsIn(['question', 'statement', 'story', 'benefit'])
  hookStyle: string

  @IsOptional()
  @IsString()
  @MaxLength(400)
  audience?: string

  @IsOptional()
  @IsString()
  @MaxLength(400)
  callToAction?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  voiceId?: string

  @IsOptional()
  @IsUUID()
  voiceProfileId?: string

  @IsOptional()
  @IsString()
  @MaxLength(600)
  voiceInstructions?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(8)
  sceneCount?: number

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  captions?: boolean

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  autoGenerateAssets?: boolean
}
