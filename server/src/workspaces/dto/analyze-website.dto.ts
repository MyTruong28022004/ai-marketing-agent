import { IsUrl, MaxLength } from 'class-validator'

export class AnalyzeWebsiteDto {
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  website!: string
}
