import { Type } from 'class-transformer'
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator'

export class SearchKnowledgeDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 2000)
  query!: string

  @IsOptional()
  @IsUUID('4')
  productId?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  topK = 8
}
