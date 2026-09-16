import { OnboardingStep } from '@prisma/client'
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator'

export class UpdateOnboardingDto {
  @IsOptional()
  @IsString()
  @Length(2, 160)
  legalName?: string

  @IsOptional()
  @IsUrl({ require_protocol: true })
  website?: string

  @IsOptional()
  @IsString()
  country?: string

  @IsOptional()
  @IsString()
  timezone?: string

  @IsOptional()
  @IsString()
  language?: string

  @IsOptional()
  @IsString()
  industry?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subIndustries?: string[]

  @IsOptional()
  @IsString()
  businessModel?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsObject()
  products?: Record<string, unknown>

  @IsOptional()
  @IsObject()
  audiences?: Record<string, unknown>

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[]

  @IsOptional()
  @IsObject()
  brandVoice?: Record<string, unknown>

  @IsOptional()
  @IsObject()
  onboardingData?: Record<string, unknown>

  @IsOptional()
  @IsEnum(OnboardingStep)
  currentStep?: OnboardingStep

  @IsOptional()
  @IsBoolean()
  completed?: boolean
}
