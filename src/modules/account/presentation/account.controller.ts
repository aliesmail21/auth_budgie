import { Controller, Get, Patch, Put, Body, UseGuards, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import {
  AccountService,
  UserProfileResponse,
  OnboardingStateResponse,
} from '../application/account.service';
import { JwtAuthGuard, AuthenticatedUser } from '../../auth/application/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/application/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { ApiStandardErrors } from '../../../common/decorators/api-standard-errors.decorator';
import {
  UpdateProfileDto,
  UpdateProfileDtoSchema,
  OnboardingStep1Dto,
  OnboardingStep1DtoSchema,
  OnboardingStep2Dto,
  OnboardingStep2DtoSchema,
  OnboardingCompleteDto,
  OnboardingCompleteDtoSchema,
} from './dto/account.dto';

@ApiTags('Account & Profile')
@Controller('account')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiStandardErrors({ auth: true })
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieves profile information for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully.',
  })
  async getMe(@CurrentUser() user: AuthenticatedUser): Promise<UserProfileResponse> {
    return this.accountService.getMe(user.id);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update user profile preferences',
    description:
      'Updates editable profile fields such as display name, timezone, locale, and language.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        displayName: { type: 'string', example: 'Jane Doe' },
        timezone: { type: 'string', example: 'Africa/Cairo' },
        language: { type: 'string', enum: ['en', 'ar'], example: 'en' },
        locale: { type: 'string', example: 'en-US' },
        digitsPreference: {
          type: 'string',
          enum: ['western', 'eastern_arabic'],
          example: 'western',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully.',
  })
  @UsePipes(new ZodValidationPipe(UpdateProfileDtoSchema))
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileResponse> {
    return this.accountService.updateMe(user.id, dto);
  }

  @Get('onboarding')
  @ApiOperation({
    summary: 'Get onboarding setup status and preview',
    description: 'Returns the completion status and saved values for all 3 onboarding steps.',
  })
  @ApiResponse({
    status: 200,
    description: 'Onboarding state retrieved.',
  })
  async getOnboarding(@CurrentUser() user: AuthenticatedUser): Promise<OnboardingStateResponse> {
    return this.accountService.getOnboarding(user.id);
  }

  @Put('onboarding/step-1')
  @ApiOperation({
    summary: 'Onboarding Step 1: Base currency & timezone',
    description:
      'Persists base currency code (e.g. EGP) and IANA timezone identifier (e.g. Africa/Cairo).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['baseCurrencyCode', 'timezone'],
      properties: {
        baseCurrencyCode: { type: 'string', example: 'EGP' },
        timezone: { type: 'string', example: 'Africa/Cairo' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Step 1 saved.',
  })
  @UsePipes(new ZodValidationPipe(OnboardingStep1DtoSchema))
  async updateStep1(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: OnboardingStep1Dto,
  ): Promise<OnboardingStateResponse> {
    return this.accountService.updateStep1(user.id, dto);
  }

  @Put('onboarding/step-2')
  @ApiOperation({
    summary: 'Onboarding Step 2: Opening baseline balance',
    description:
      'Stores opening starting balance in integer minor units (e.g. 10000.00 -> 1000000) and date.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['openingBalanceMinor', 'openingBalanceDate'],
      properties: {
        openingBalanceMinor: { type: 'string', example: '1000000' },
        openingBalanceDate: { type: 'string', example: '2026-10-30T00:00:00.000Z' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Step 2 saved.',
  })
  @UsePipes(new ZodValidationPipe(OnboardingStep2DtoSchema))
  async updateStep2(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: OnboardingStep2Dto,
  ): Promise<OnboardingStateResponse> {
    return this.accountService.updateStep2(user.id, dto);
  }

  @Put('onboarding/complete')
  @ApiOperation({
    summary: 'Onboarding Step 3: Preferences & confirmation',
    description:
      'Finalizes setup, marks onboarding_completed to true, and returns the authoritative user profile.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        language: { type: 'string', enum: ['en', 'ar'], example: 'en' },
        locale: { type: 'string', example: 'en-US' },
        digitsPreference: {
          type: 'string',
          enum: ['western', 'eastern_arabic'],
          example: 'western',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Onboarding finalized successfully.',
  })
  @UsePipes(new ZodValidationPipe(OnboardingCompleteDtoSchema))
  async completeOnboarding(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: OnboardingCompleteDto,
  ): Promise<UserProfileResponse> {
    return this.accountService.completeOnboarding(user.id, dto);
  }
}
