import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { CompetitorsModule } from './competitors/competitors.module'
import { HealthController } from './health.controller'
import { IntegrationsModule } from './integrations/integrations.module'
import { PrismaModule } from './prisma/prisma.module'
import { ProductsModule } from './products/products.module'
import { TrendsModule } from './trends/trends.module'
import { WorkspacesModule } from './workspaces/workspaces.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['server/.env', '.env', '../.env'],
      cache: true,
    }),
    PrismaModule,
    AuthModule,
    WorkspacesModule,
    CompetitorsModule,
    IntegrationsModule,
    ProductsModule,
    TrendsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
