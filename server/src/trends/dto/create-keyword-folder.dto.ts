import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class CreateKeywordFolderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string
}
