import { AppError } from '../../../common/errors/app-error';

export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw AppError.badRequest('Email is required.');
  }

  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed) || trimmed.length > 255) {
    throw AppError.badRequest('Invalid email format.');
  }

  return trimmed;
}
