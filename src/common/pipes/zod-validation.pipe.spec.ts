import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const testSchema = z.object({
    email: z.string().email(),
    amount: z.number().positive(),
  });

  const pipe = new ZodValidationPipe(testSchema);

  it('should transform and return valid data', () => {
    const validData = {
      email: 'test@budgie.local',
      amount: 42.5,
    };

    const result = pipe.transform(validData, { type: 'body' });
    expect(result).toEqual(validData);
  });

  it('should throw BadRequestException with structured details for invalid data', () => {
    const invalidData = {
      email: 'not-an-email',
      amount: -10,
    };

    expect(() => pipe.transform(invalidData, { type: 'body' })).toThrow(BadRequestException);

    try {
      pipe.transform(invalidData, { type: 'body' });
    } catch (error: unknown) {
      const badReq = error as BadRequestException;
      const response = badReq.getResponse() as Record<string, unknown>;

      expect(badReq.getStatus()).toBe(400);
      expect(response.message).toBe('Validation failed');
      expect(response.errorCode).toBe('VALIDATION_ERROR');
      expect(Array.isArray(response.details)).toBe(true);

      const details = response.details as Array<{ field: string; message: string }>;
      expect(details.some((d) => d.field === 'email')).toBe(true);
      expect(details.some((d) => d.field === 'amount')).toBe(true);
    }
  });

  it('should passthrough value when metadata type is custom', () => {
    const customUser = { id: 'usr_123', email: 'user@example.com' };
    const result = pipe.transform(customUser, { type: 'custom' });
    expect(result).toBe(customUser);
  });

  it('should passthrough value when no schema is provided', () => {
    const emptyPipe = new ZodValidationPipe();
    const rawData = { any: 'data' };

    const result = emptyPipe.transform(rawData, { type: 'custom' });
    expect(result).toEqual(rawData);
  });
});
