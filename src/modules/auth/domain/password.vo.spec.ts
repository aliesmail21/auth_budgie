import { PasswordRules } from './password.vo';
import { AppError } from '../../../common/errors/app-error';

describe('PasswordRules', () => {
  it('should accept strong passwords meeting all requirements', () => {
    expect(() => PasswordRules.validate('StrongP@ss123')).not.toThrow();
    expect(() => PasswordRules.validate('Valid123#Secure')).not.toThrow();
  });

  it('should reject passwords shorter than 8 characters', () => {
    expect(() => PasswordRules.validate('Short1!')).toThrow(AppError);
  });

  it('should reject passwords missing uppercase letters', () => {
    expect(() => PasswordRules.validate('lowercase123!')).toThrow(AppError);
  });

  it('should reject passwords missing lowercase letters', () => {
    expect(() => PasswordRules.validate('UPPERCASE123!')).toThrow(AppError);
  });

  it('should reject passwords missing numbers or special characters', () => {
    expect(() => PasswordRules.validate('OnlyLettersHere')).toThrow(AppError);
  });

  it('should reject passwords containing whitespace', () => {
    expect(() => PasswordRules.validate('Strong P@ss123')).toThrow(AppError);
    expect(PasswordRules.isValid('Strong P@ss123')).toBe(false);
  });

  it('should validate via isValid returning boolean', () => {
    expect(PasswordRules.isValid('StrongP@ss123')).toBe(true);
    expect(PasswordRules.isValid('short')).toBe(false);
    expect(PasswordRules.isValid('')).toBe(false);
  });

  it('should reject empty or non-string passwords', () => {
    expect(() => PasswordRules.validate('')).toThrow(AppError);
    expect(() => PasswordRules.validate(null as unknown as string)).toThrow(AppError);
  });
});
