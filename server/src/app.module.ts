import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { CompetitorsModule } from './competitors/competitors.module'
import { HealthController } from './health.controller'
import { IntegrationsModule } from './integrations/integrations.module'
import { PrismaModule } from './prisma/prisma.module'
import { WorkspacesModule } from './workspaces/workspaces.module'
import { VideosModule } from './videos/videos.module'
import { BillingModule } from './billing/billing.module'
import { LeadsModule } from './leads/leads.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['server/.env', '.env', '../.env'],
      cache: true,
    }),
    PrismaModule,
    BillingModule,
    AuthModule,
    WorkspacesModule,
    CompetitorsModule,
    IntegrationsModule,
    VideosModule,
    LeadsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
