import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService, AuthResponse, AuthTokens } from '../application/auth.service';
import {
  JwtAuthGuard,
  AuthenticatedUser,
  AuthenticatedSession,
  AuthenticatedRequest,
} from '../application/guards/jwt-auth.guard';
import { CurrentUser } from '../application/decorators/current-user.decorator';
import { CurrentSession } from '../application/decorators/current-session.decorator';
import {
  ClientMetadata,
  ClientInfo,
} from '../application/decorators/client-info.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { ApiStandardErrors } from '../../../common/decorators/api-standard-errors.decorator';
import {
  RegisterDto,
  RegisterDtoSchema,
  LoginDto,
  LoginDtoSchema,
  RefreshTokenDto,
  RefreshTokenDtoSchema,
  ChangePasswordDto,
  ChangePasswordDtoSchema,
  ForgotPasswordDto,
  ForgotPasswordDtoSchema,
  ResetPasswordDto,
  ResetPasswordDtoSchema,
  VerifyEmailDto,
  VerifyEmailDtoSchema,
  ResendVerificationDto,
  ResendVerificationDtoSchema,
} from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user account',
    description:
      'Creates a user account, initializes an independent device session, issues JWT access and opaque refresh tokens, and dispatches an email verification link.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'StrongP@ssw0rd!' },
        displayName: { type: 'string', example: 'Jane Doe' },
        deviceName: { type: 'string', example: 'Pixel 8' },
        deviceType: { type: 'string', example: 'mobile' },
        deviceIdentifier: { type: 'string', example: 'uuid-or-hardware-id' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Account successfully registered and authenticated.',
  })
  @ApiStandardErrors({ conflict: true })
  @UsePipes(new ZodValidationPipe(RegisterDtoSchema))
  async register(
    @Body() dto: RegisterDto,
    @ClientMetadata() client: ClientInfo,
  ): Promise<AuthResponse> {
    return this.authService.register(dto, client.ipAddress, client.userAgent);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate with email and password',
    description:
      'Validates credentials, establishes a new independent device session, and returns access and refresh tokens.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'StrongP@ssw0rd!' },
        deviceName: { type: 'string', example: 'Pixel 8' },
        deviceType: { type: 'string', example: 'mobile' },
        deviceIdentifier: { type: 'string', example: 'uuid-or-hardware-id' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully authenticated.',
  })
  @ApiStandardErrors()
  @UsePipes(new ZodValidationPipe(LoginDtoSchema))
  async login(
    @Body() dto: LoginDto,
    @ClientMetadata() client: ClientInfo,
  ): Promise<AuthResponse> {
    return this.authService.login(dto, client.ipAddress, client.userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token using refresh token rotation',
    description:
      'Performs atomic refresh token rotation. Detects token reuse and automatically revokes compromised sessions.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: { type: 'string', example: 'opaque-refresh-token-string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'New access token and rotated refresh token issued.',
  })
  @ApiStandardErrors({ auth: true })
  @UsePipes(new ZodValidationPipe(RefreshTokenDtoSchema))
  async refresh(
    @Body() dto: RefreshTokenDto,
    @ClientMetadata() client: ClientInfo,
  ): Promise<AuthTokens> {
    return this.authService.refresh(dto.refreshToken, client.ipAddress, client.userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Logout from the current device session',
    description: 'Revokes the active device session and all associated refresh tokens.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully logged out.',
  })
  @ApiStandardErrors({ auth: true })
  async logout(@CurrentSession() session: AuthenticatedSession): Promise<{ message: string }> {
    return this.authService.logout(session.id);
  }

  @Post(['logout-all', 'logout-everywhere'])
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Logout from all devices (logout everywhere)',
    description:
      'Revokes all active device sessions and refresh tokens belonging to the authenticated user.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully logged out from all devices.',
  })
  @ApiStandardErrors({ auth: true })
  async logoutAll(@CurrentUser() user: AuthenticatedUser): Promise<{ message: string }> {
    return this.authService.logoutEverywhere(user.id);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Change account password',
    description:
      'Verifies current password, updates to a new Argon2id password hash, and revokes all other active device sessions for security.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['currentPassword', 'newPassword'],
      properties: {
        currentPassword: { type: 'string', example: 'OldP@ssw0rd!' },
        newPassword: { type: 'string', example: 'NewStrongP@ssw0rd!' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully.',
  })
  @ApiStandardErrors({ auth: true })
  @UsePipes(new ZodValidationPipe(ChangePasswordDtoSchema))
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSession() session: AuthenticatedSession,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(user.id, session.id, dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a password reset link',
    description:
      'Dispatches a cryptographically secure password reset token via email. Always returns a generic response to prevent account enumeration.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', example: 'user@example.com' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Generic confirmation response.',
  })
  @ApiStandardErrors()
  @UsePipes(new ZodValidationPipe(ForgotPasswordDtoSchema))
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password using a secure token',
    description:
      'Validates the single-use reset token, updates the password hash, marks token as used, and invalidates all active sessions.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token', 'newPassword'],
      properties: {
        token: { type: 'string', example: 'reset-token-hex' },
        newPassword: { type: 'string', example: 'NewStrongP@ssw0rd!' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset successfully.',
  })
  @ApiStandardErrors()
  @UsePipes(new ZodValidationPipe(ResetPasswordDtoSchema))
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify account email address',
    description: 'Validates email verification token and transitions account status to ACTIVE.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string', example: 'verification-token-hex' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email verified successfully.',
  })
  @ApiStandardErrors()
  @UsePipes(new ZodValidationPipe(VerifyEmailDtoSchema))
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ message: string }> {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend email verification message',
    description: 'Generates a fresh email verification token if the account is not yet verified.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification email dispatched.',
  })
  @ApiStandardErrors()
  @UsePipes(new ZodValidationPipe(ResendVerificationDtoSchema))
  async resendVerification(
    @Body() dto: ResendVerificationDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    const user = req.user;
    const userId = user?.id;
    return this.authService.resendVerification(dto.email, userId);
  }
}
