import { z } from 'zod';
import { AppError } from '../../../common/errors/app-error';

export class PasswordRules {
  static readonly MIN_LENGTH = 8;
  static readonly MAX_LENGTH = 128;

  static isValid(password: string): boolean {
    if (!password || typeof password !== 'string') return false;
    if (password.length < this.MIN_LENGTH || password.length > this.MAX_LENGTH) return false;
    if (/\s/.test(password)) return false;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumberOrSymbol = /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);
    return hasUppercase && hasLowercase && hasNumberOrSymbol;
  }

  static validate(password: string): void {
    if (!password || typeof password !== 'string') {
      throw AppError.badRequest('Password is required.');
    }

    if (password.length < this.MIN_LENGTH) {
      throw AppError.badRequest(`Password must be at least ${this.MIN_LENGTH} characters long.`);
    }

    if (password.length > this.MAX_LENGTH) {
      throw AppError.badRequest(`Password cannot exceed ${this.MAX_LENGTH} characters.`);
    }

    if (/\s/.test(password)) {
      throw AppError.badRequest('Password cannot contain whitespace characters.');
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumberOrSymbol = /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumberOrSymbol) {
      throw AppError.badRequest(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number or special symbol.',
      );
    }
  }
}

export const passwordSchema = z
  .string()
  .min(
    PasswordRules.MIN_LENGTH,
    `Password must be at least ${PasswordRules.MIN_LENGTH} characters`,
  )
  .max(
    PasswordRules.MAX_LENGTH,
    `Password cannot exceed ${PasswordRules.MAX_LENGTH} characters`,
  )
  .refine((val) => !/\s/.test(val), 'Password cannot contain whitespace characters')
  .refine(
    (val) => PasswordRules.isValid(val),
    'Password must contain at least one uppercase letter, one lowercase letter, and one number or special symbol',
  );
