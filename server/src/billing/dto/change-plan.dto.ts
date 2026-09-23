import { ServicePlan } from '@prisma/client'
import { IsEnum } from 'class-validator'

export class ChangePlanDto {
  @IsEnum(ServicePlan)
  plan: ServicePlan
}
