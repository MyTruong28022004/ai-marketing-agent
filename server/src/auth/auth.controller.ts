import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { FastifyReply, FastifyRequest } from 'fastify'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

@Controller('auth')
export class AuthController {
  private readonly refreshDays: number
  private readonly secureCookies: boolean

  constructor(
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    this.refreshDays = config.get<number>('REFRESH_TOKEN_TTL_DAYS', 30)
    this.secureCookies = config.get<string>('NODE_ENV') === 'production'
  }

  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const result = await this.auth.register(dto, this.clientContext(req))
    this.setRefreshCookie(res, result.refreshToken)
    const { refreshToken: _refreshToken, ...response } = result
    return response
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const result = await this.auth.login(dto, this.clientContext(req))
    this.setRefreshCookie(res, result.refreshToken)
    const { refreshToken: _refreshToken, ...response } = result
    return response
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const result = await this.auth.refresh(req.cookies?.milo_refresh as string | undefined, this.clientContext(req))
    this.setRefreshCookie(res, result.refreshToken)
    const { refreshToken: _refreshToken, ...response } = result
    return response
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    await this.auth.logout(req.cookies?.milo_refresh as string | undefined)
    res.clearCookie('milo_refresh', { path: '/api/auth' })
  }

  private setRefreshCookie(response: FastifyReply, token: string) {
    response.setCookie('milo_refresh', token, {
      httpOnly: true,
      secure: this.secureCookies,
      sameSite: 'lax',
      path: '/api/auth',
      // Fastify uses seconds for Max-Age (Express uses milliseconds).
      maxAge: this.refreshDays * 24 * 60 * 60,
    })
  }

  private clientContext(request: FastifyRequest) {
    return {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    }
  }
}
