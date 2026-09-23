import { Type } from 'class-transformer'
import { ContentFormatType, ContentPillar, ContentPlatform } from '@prisma/client'
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min, ValidateNested } from 'class-validator'

export class ContentPlanProductMatchDto {
  @IsString()
  @MaxLength(80)
  productId!: string

  @IsString()
  @MaxLength(180)
  productName!: string

  @IsIn(['FIT', 'PARTIAL'])
  fit!: 'FIT' | 'PARTIAL'

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string
}

export class ContentPlanKeywordDto {
  @IsString()
  @MaxLength(180)
  keyword!: string

  @IsOptional()
  @IsString()
  @MaxLength(160)
  topicName?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  searchVolume?: number | null

  @IsOptional()
  @IsString()
  @MaxLength(80)
  volumePeriod?: string | null

  @IsArray()
  @ArrayMaxSize(4)
  @IsUrl({}, { each: true })
  sourceUrls!: string[]

  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ContentPlanProductMatchDto)
  productMatches!: ContentPlanProductMatchDto[]
}

export class GenerateContentPlanDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ContentPlanKeywordDto)
  keywords!: ContentPlanKeywordDto[]

  @IsDateString()
  startDate!: string

  @IsDateString()
  endDate!: string

  @IsInt()
  @Min(1)
  @Max(100)
  postCount!: number

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsEnum(ContentPlatform, { each: true })
  platforms!: ContentPlatform[]

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(11)
  @IsEnum(ContentPillar, { each: true })
  pillars!: ContentPillar[]

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsEnum(ContentFormatType, { each: true })
  formats!: ContentFormatType[]
}
