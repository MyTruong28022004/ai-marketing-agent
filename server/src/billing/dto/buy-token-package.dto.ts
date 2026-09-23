import { IsIn } from 'class-validator'

export class BuyTokenPackageDto {
  @IsIn(['TOKENS_100K', 'TOKENS_500K', 'TOKENS_1M'])
  packageCode: 'TOKENS_100K' | 'TOKENS_500K' | 'TOKENS_1M'
}
