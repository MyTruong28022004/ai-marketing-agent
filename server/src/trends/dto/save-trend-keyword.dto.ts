import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, IsUrl, Max, MaxLength, Min, ValidateNested } from 'class-validator'

class SavedKeywordProductMatchDto {
  @IsUUID('4')
  productId!: string

  @IsString()
  @MaxLength(180)
  productName!: string

  @IsIn(['FIT', 'PARTIAL', 'NOT_FIT', 'UNKNOWN'])
  fit!: 'FIT' | 'PARTIAL' | 'NOT_FIT' | 'UNKNOWN'

  @IsOptional()
  @IsString()
  @MaxLength(600)
  reason?: string
}

export class SaveTrendKeywordDto {
  @IsString()
  @MaxLength(180)
  keyword!: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  topicSlug?: string

  @IsOptional()
  @IsString()
  @MaxLength(180)
  topicName?: string

  @IsIn(['RISING', 'STABLE', 'SEASONAL', 'BREAKOUT'])
  trendType!: 'RISING' | 'STABLE' | 'SEASONAL' | 'BREAKOUT'

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  trendScore?: number | null

  @IsOptional()
  @IsIn(['GOOGLE_TRENDS'])
  trendScoreSource?: 'GOOGLE_TRENDS' | null

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  searchVolume?: number | null

  @IsOptional()
  @IsString()
  @MaxLength(120)
  volumeSource?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(80)
  volumePeriod?: string | null

  @IsString()
  @MaxLength(600)
  reason!: string

  @IsString()
  @MaxLength(100)
  intent!: string

  @IsArray()
  @ArrayMaxSize(4)
  @IsUrl({ require_protocol: true }, { each: true })
  sourceUrls!: string[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => SavedKeywordProductMatchDto)
  productMatches?: SavedKeywordProductMatchDto[]

  @IsOptional()
  @IsUUID('4')
  folderId?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  folderName?: string
}
