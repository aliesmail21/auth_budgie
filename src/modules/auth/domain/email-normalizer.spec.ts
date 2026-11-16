import { normalizeEmail } from './email-normalizer';
import { AppError } from '../../../common/errors/app-error';

describe('normalizeEmail', () => {
  it('should trim and lowercase standard email addresses', () => {
    expect(normalizeEmail('  User.Name@Example.COM  ')).toBe('user.name@example.com');
  });

  it('should reject invalid email formats', () => {
    expect(() => normalizeEmail('not-an-email')).toThrow(AppError);
    expect(() => normalizeEmail('@missinguser.com')).toThrow(AppError);
    expect(() => normalizeEmail('user@missingtld')).toThrow(AppError);
    expect(() => normalizeEmail('')).toThrow(AppError);
  });
});
