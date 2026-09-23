import { IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator'

export class ConnectFacebookManualDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'Page ID phải là chuỗi số của Fanpage Facebook.' })
  @Length(1, 80)
  pageId!: string

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(5000)
  pageAccessToken!: string

  @IsOptional()
  @IsString()
  @Length(2, 190)
  pageName?: string
}
