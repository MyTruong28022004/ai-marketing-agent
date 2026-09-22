import { Type } from 'class-transformer'
import { ContentFormatType, ContentPillar, ContentPlatform } from '@prisma/client'
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator'

export class SaveContentPlanPostDto {
  @IsDateString()
  date!: string

  @IsEnum(ContentPlatform)
  platform!: ContentPlatform

  @IsEnum(ContentPillar)
  pillar!: ContentPillar

  @IsString()
  @MaxLength(100)
  contentType!: string

  @IsEnum(ContentFormatType)
  format!: ContentFormatType

  @IsString()
  @MaxLength(220)
  title!: string

  @IsString()
  @MaxLength(700)
  highlight!: string

  @IsString()
  @MaxLength(180)
  keyword!: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  productId?: string | null

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  volume?: number | null

  @IsOptional()
  @IsString()
  @MaxLength(80)
  volumePeriod?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  ref?: string | null
}

export class SaveContentPlanDto {
  @IsDateString()
  startDate!: string

  @IsDateString()
  endDate!: string

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SaveContentPlanPostDto)
  posts!: SaveContentPlanPostDto[]
}
