import { IsUUID } from 'class-validator'

export class SelectFacebookPageDto {
  @IsUUID('4')
  integrationId!: string
}
