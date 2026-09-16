import { Controller, Get } from '@nestjs/common'

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'milo-api',
      timestamp: new Date().toISOString(),
    }
  }
}
