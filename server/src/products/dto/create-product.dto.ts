import { IsOptional, IsString, MaxLength, Matches } from 'class-validator'

export class CreateProductDto {
  @IsString()
  @MaxLength(160)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(1800)
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string
}
