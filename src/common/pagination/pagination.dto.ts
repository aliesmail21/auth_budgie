import { z } from 'zod';

export const PaginationQuerySchema = z.object({
  page: z
    .union([z.string(), z.number()])
    .default(1)
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .pipe(z.number().int().positive('Page must be a positive integer').default(1)),

  limit: z
    .union([z.string(), z.number()])
    .default(20)
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .pipe(
      z
        .number()
        .int()
        .positive('Limit must be a positive integer')
        .max(100, 'Limit cannot exceed 100')
        .default(20),
    ),

  sortBy: z.string().trim().min(1).optional(),

  sortOrder: z
    .enum(['asc', 'desc'], {
      errorMap: () => ({ message: "sortOrder must be either 'asc' or 'desc'" }),
    })
    .default('desc'),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
