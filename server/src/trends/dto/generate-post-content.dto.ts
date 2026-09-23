import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsUUID } from 'class-validator'

export type ContentGenerationTone = 'BRAND_VOICE' | 'PROFESSIONAL' | 'FRIENDLY' | 'EDUCATIONAL' | 'PERSUASIVE'
export type ContentGenerationSeoMode = 'SEO_STANDARD' | 'SOCIAL_FIRST' | 'CONVERSION'
export type ContentGenerationLength = 'SHORT' | 'MEDIUM' | 'LONG'
export type ContentGenerationCtaStyle = 'NONE' | 'SOFT' | 'DIRECT'

export class GeneratePostContentDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  @Type(() => String)
  postIds?: string[]

  @IsOptional()
  @IsIn(['BRAND_VOICE', 'PROFESSIONAL', 'FRIENDLY', 'EDUCATIONAL', 'PERSUASIVE'])
  tone?: ContentGenerationTone

  @IsOptional()
  @IsIn(['SEO_STANDARD', 'SOCIAL_FIRST', 'CONVERSION'])
  seoMode?: ContentGenerationSeoMode

  @IsOptional()
  @IsIn(['SHORT', 'MEDIUM', 'LONG'])
  contentLength?: ContentGenerationLength

  @IsOptional()
  @IsIn(['NONE', 'SOFT', 'DIRECT'])
  ctaStyle?: ContentGenerationCtaStyle
}
