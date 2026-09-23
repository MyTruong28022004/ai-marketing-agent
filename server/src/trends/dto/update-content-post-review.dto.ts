import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateContentPostReviewDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(220)
  title?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(700)
  highlight?: string
}
