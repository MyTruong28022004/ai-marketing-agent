import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'

export class GenerateVideoScriptDto {
  @IsString()
  @MinLength(2)
  @MaxLength(240)
  topic: string

  @IsIn(['vi', 'en'])
  language: string

  @IsString()
  @MaxLength(80)
  style: string

  @IsString()
  @MaxLength(80)
  tone: string

  @IsOptional()
  @IsString()
  @MaxLength(400)
  audience?: string

  @IsOptional()
  @IsString()
  @MaxLength(400)
  callToAction?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(50)
  @Max(500)
  wordCount?: number
}
