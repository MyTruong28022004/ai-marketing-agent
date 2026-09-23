import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator'

export class SearchTrendsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @IsUUID('4', { each: true })
  topicIds!: string[]
}
