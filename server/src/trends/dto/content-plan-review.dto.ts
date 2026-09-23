import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'

export class ContentPlanReviewDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  postIds?: string[]

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string
}
