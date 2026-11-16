import { Module } from '@nestjs/common';
import { AuthController } from './presentation/auth.controller';
import { AuthService } from './application/auth.service';
import { RegistrationService } from './application/services/registration.service';
import { AuthenticationService } from './application/services/authentication.service';
import { TokenRefreshService } from './application/services/token-refresh.service';
import { SessionService } from './application/services/session.service';
import { PasswordManagementService } from './application/services/password-management.service';
import { EmailVerificationService } from './application/services/email-verification.service';
import { JwtAuthGuard } from './application/guards/jwt-auth.guard';
import { TokenService } from './infrastructure/token.service';
import { PasswordHasherService } from './infrastructure/password-hasher.service';
import { EmailService } from './infrastructure/email.service';
import { TokenCleanupService } from './infrastructure/token-cleanup.service';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { AppConfigModule } from '../../config/app-config.module';

@Module({
  imports: [DatabaseModule, AppConfigModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    RegistrationService,
    AuthenticationService,
    TokenRefreshService,
    SessionService,
    PasswordManagementService,
    EmailVerificationService,
    JwtAuthGuard,
    TokenService,
    PasswordHasherService,
    EmailService,
    TokenCleanupService,
  ],
  exports: [
    AuthService,
    RegistrationService,
    AuthenticationService,
    TokenRefreshService,
    SessionService,
    PasswordManagementService,
    EmailVerificationService,
    JwtAuthGuard,
    TokenService,
    PasswordHasherService,
    TokenCleanupService,
  ],
})
export class AuthModule {}
