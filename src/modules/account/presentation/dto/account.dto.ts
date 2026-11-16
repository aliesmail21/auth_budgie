import { z } from 'zod';

export function isValidIanaTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const UpdateProfileDtoSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  timezone: z
    .string()
    .trim()
    .refine((val) => isValidIanaTimezone(val), {
      message: 'Invalid IANA timezone identifier (e.g. Africa/Cairo, UTC, America/New_York)',
    })
    .optional(),
  language: z.enum(['en', 'ar']).optional(),
  locale: z
    .string()
    .trim()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Locale must be in format like en-US or ar-EG')
    .optional(),
  digitsPreference: z.enum(['western', 'eastern_arabic']).optional(),
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileDtoSchema>;

export const OnboardingStep1DtoSchema = z.object({
  baseCurrencyCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Currency code must be a 3-letter ISO code (e.g. EGP, USD, EUR)'),
  timezone: z
    .string()
    .trim()
    .refine((val) => isValidIanaTimezone(val), {
      message: 'Invalid IANA timezone identifier (e.g. Africa/Cairo, UTC, America/New_York)',
    }),
});

export type OnboardingStep1Dto = z.infer<typeof OnboardingStep1DtoSchema>;

export const OnboardingStep2DtoSchema = z.object({
  openingBalanceMinor: z
    .union([
      z.string().regex(/^-?\d+$/, 'openingBalanceMinor must be an integer numeric string'),
      z.number().int('openingBalanceMinor must be an integer'),
      z.bigint(),
    ])
    .transform((val) => BigInt(val)),
  openingBalanceDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'openingBalanceDate must be a valid ISO 8601 date string',
    })
    .transform((val) => new Date(val)),
});

export type OnboardingStep2Dto = z.infer<typeof OnboardingStep2DtoSchema>;

export const OnboardingCompleteDtoSchema = z.object({
  language: z.enum(['en', 'ar']).optional().default('en'),
  locale: z
    .string()
    .trim()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Locale must be in format like en-US or ar-EG')
    .optional()
    .default('en-US'),
  digitsPreference: z.enum(['western', 'eastern_arabic']).optional().default('western'),
});

export type OnboardingCompleteDto = z.infer<typeof OnboardingCompleteDtoSchema>;
