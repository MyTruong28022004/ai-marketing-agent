import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class UpdateVideoSceneDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  narration?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  visualPrompt?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(30_000)
  durationMs?: number

  @IsOptional()
  @IsIn(['cut', 'fade', 'slide-left', 'zoom'])
  transition?: string
}
