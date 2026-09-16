import { IsString, Length } from 'class-validator'

export class CreateWorkspaceDto {
  @IsString()
  @Length(2, 120)
  name: string
}
