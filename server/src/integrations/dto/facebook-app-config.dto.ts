import { IsNotEmpty, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator'

export class FacebookAppConfigDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'Facebook App ID phải là chuỗi số.' })
  @Length(1, 80)
  appId!: string

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(5000)
  appSecret!: string

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'Login Configuration ID phải là chuỗi số.' })
  @Length(1, 80)
  loginConfigId!: string
}
