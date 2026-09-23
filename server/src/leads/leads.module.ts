import { Module } from '@nestjs/common'
import { WorkspaceAccessGuard } from '../common/guards/workspace-access.guard'
import { LeadsController } from './leads.controller'
import { LeadsService } from './leads.service'

@Module({ controllers: [LeadsController], providers: [LeadsService, WorkspaceAccessGuard] })
export class LeadsModule {}
