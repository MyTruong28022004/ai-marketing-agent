import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator'

export class ReorderVideoScenesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @IsUUID('4', { each: true })
  sceneIds: string[]
}
