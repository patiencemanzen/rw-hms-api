import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { AuthCookies, clientInfo } from './auth.cookies';
import { CSRF_COOKIE, REFRESH_COOKIE } from './auth.constants';
import { AuthService, type IssuedTokens } from './auth.service';
import { CurrentAuth } from './decorators/current-auth.decorator';
import { AuthSessionDto } from './dto/auth-session.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { AuthContext } from './types/auth.types';
import { generateToken } from './utils/tokens';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookies: AuthCookies,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in with email and password; sets the session cookies' })
  @ApiOkResponse({ type: AuthSessionDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'INVALID_CREDENTIALS' })
  @ApiResponse({ status: HttpStatus.LOCKED, type: ErrorResponseDto, description: 'ACCOUNT_LOCKED' })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionDto> {
    const tokens = await this.authService.login(dto.email, dto.password, clientInfo(req));
    const csrfToken = generateToken();
    this.cookies.setCsrf(res, csrfToken);
    return this.issue(res, tokens, csrfToken);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new access token' })
  @ApiOkResponse({ type: AuthSessionDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'SESSION_EXPIRED' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionDto> {
    try {
      const tokens = await this.authService.refresh(
        this.cookies.read(req, REFRESH_COOKIE),
        clientInfo(req),
      );
      // Keep the CSRF token stable across refreshes so other open tabs keep working.
      let csrfToken = this.cookies.read(req, CSRF_COOKIE);
      if (!csrfToken) {
        csrfToken = generateToken();
        this.cookies.setCsrf(res, csrfToken);
      }
      return await this.issue(res, tokens, csrfToken);
    } catch (error) {
      this.cookies.clearAll(res);
      throw error;
    }
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the current session and clear the session cookies' })
  @ApiNoContentResponse()
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.authService.logout(this.cookies.read(req, REFRESH_COOKIE), clientInfo(req));
    this.cookies.clearAll(res);
  }

  @Get('me')
  @ApiOperation({ summary: 'The signed-in user, their facility roles and the CSRF token' })
  @ApiOkResponse({ type: AuthSessionDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  async me(
    @CurrentAuth() auth: AuthContext,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionDto> {
    let csrfToken = this.cookies.read(req, CSRF_COOKIE);
    if (!csrfToken) {
      csrfToken = generateToken();
      this.cookies.setCsrf(res, csrfToken);
    }
    return this.authService.getSession(auth.userId, csrfToken);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Email a password reset link',
    description: 'Always returns 202, whether or not the account exists.',
  })
  @ApiAcceptedResponse()
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request): Promise<void> {
    await this.authService.requestPasswordReset(dto.identifier, clientInfo(req));
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Set a new password with a reset token; signs out every session' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'INVALID_RESET_TOKEN or WEAK_PASSWORD',
  })
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request): Promise<void> {
    await this.authService.resetPassword(dto.token, dto.password, clientInfo(req));
  }

  private async issue(
    res: Response,
    tokens: IssuedTokens,
    csrfToken: string,
  ): Promise<AuthSessionDto> {
    this.cookies.setAccess(res, tokens.accessToken);
    if (tokens.refreshToken) this.cookies.setRefresh(res, tokens.refreshToken);
    return this.authService.getSession(tokens.userId, csrfToken);
  }
}
