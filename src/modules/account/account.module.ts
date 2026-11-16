import { Module } from '@nestjs/common';
import { AccountController } from './presentation/account.controller';
import { AccountService } from './application/account.service';
import { ProfileService } from './application/services/profile.service';
import { OnboardingService } from './application/services/onboarding.service';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AccountController],
  providers: [AccountService, ProfileService, OnboardingService],
  exports: [AccountService, ProfileService, OnboardingService],
})
export class AccountModule {}
