import { IsEmail, IsString, Length, Matches } from 'class-validator'

export class RegisterDto {
  @IsEmail()
  email: string

  @IsString()
  @Length(2, 80)
  name: string

  @IsString()
  @Length(10, 128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'password must contain uppercase, lowercase and number',
  })
  password: string

  @IsString()
  @Length(2, 120)
  companyName: string
}
