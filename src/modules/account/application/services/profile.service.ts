import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AppError } from '../../../../common/errors/app-error';
import { UpdateProfileDto } from '../../presentation/dto/account.dto';
import { UserProfileResponse, mapUserToProfileResponse } from '../account-types';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves the authenticated user profile.
   */
  async getMe(userId: string): Promise<UserProfileResponse> {
    const user = await this.findActiveUserOrThrow(userId);
    return mapUserToProfileResponse(user);
  }

  /**
   * Updates user editable profile preferences.
   */
  async updateMe(userId: string, dto: UpdateProfileDto): Promise<UserProfileResponse> {
    const user = await this.findActiveUserOrThrow(userId);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName !== undefined ? dto.displayName : user.displayName,
        timezone: dto.timezone !== undefined ? dto.timezone : user.timezone,
        language: dto.language !== undefined ? dto.language : user.language,
        locale: dto.locale !== undefined ? dto.locale : user.locale,
        digitsPreference:
          dto.digitsPreference !== undefined ? dto.digitsPreference : user.digitsPreference,
      },
    });

    return mapUserToProfileResponse(updated);
  }

  /**
   * Fetches an active (non-soft-deleted) user by ID or throws 404 NotFound.
   */
  async findActiveUserOrThrow(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt !== null) {
      throw AppError.notFound('User profile not found.');
    }

    return user;
  }
}
