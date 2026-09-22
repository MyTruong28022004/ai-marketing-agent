import { Controller, Get, Query, Res } from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import { IntegrationsService } from './integrations.service'

@Controller('integrations/facebook')
export class FacebookOAuthController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Res() reply: FastifyReply,
  ) {
    const redirectUrl = await this.integrations.handleFacebookOAuthCallback(code, state, error, errorDescription)
    return reply.code(302).redirect(redirectUrl)
  }
}
