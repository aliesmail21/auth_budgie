import { z } from 'zod';
import { passwordSchema } from '../../domain/password.vo';

export const RegisterDtoSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(255, 'Email cannot exceed 255 characters'),
  password: passwordSchema,
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name cannot be empty')
    .max(100, 'Display name cannot exceed 100 characters')
    .optional(),
  deviceName: z.string().trim().max(100).optional().default('Flutter Mobile App'),
  deviceType: z.string().trim().max(50).optional().default('mobile'),
  deviceIdentifier: z.string().trim().max(255).optional(),
});

export type RegisterDto = z.infer<typeof RegisterDtoSchema>;
export type RegisterInput = z.input<typeof RegisterDtoSchema>;

export const LoginDtoSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  deviceName: z.string().trim().max(100).optional().default('Flutter Mobile App'),
  deviceType: z.string().trim().max(50).optional().default('mobile'),
  deviceIdentifier: z.string().trim().max(255).optional(),
});

export type LoginDto = z.infer<typeof LoginDtoSchema>;
export type LoginInput = z.input<typeof LoginDtoSchema>;

export const RefreshTokenDtoSchema = z.object({
  refreshToken: z.string().trim().min(1, 'Refresh token is required'),
});

export type RefreshTokenDto = z.infer<typeof RefreshTokenDtoSchema>;

export const ChangePasswordDtoSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export type ChangePasswordDto = z.infer<typeof ChangePasswordDtoSchema>;

export const ForgotPasswordDtoSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
});

export type ForgotPasswordDto = z.infer<typeof ForgotPasswordDtoSchema>;

export const ResetPasswordDtoSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
});

export type ResetPasswordDto = z.infer<typeof ResetPasswordDtoSchema>;

export const VerifyEmailDtoSchema = z.object({
  token: z.string().trim().min(1, 'Verification token is required'),
});

export type VerifyEmailDto = z.infer<typeof VerifyEmailDtoSchema>;

export const ResendVerificationDtoSchema = z.object({
  email: z.string().trim().email('Invalid email address').optional(),
});

export type ResendVerificationDto = z.infer<typeof ResendVerificationDtoSchema>;
