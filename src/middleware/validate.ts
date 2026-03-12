import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { ApiResponse } from '../types';

export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const response: ApiResponse<null> = {
        success: false,
        error: result.error.errors.map((e) => e.message).join(', '),
      };
      res.status(400).json(response);
      return;
    }
    req.body = result.data;
    next();
  };

export const createUrlSchema = z.object({
  url: z
    .string({ required_error: 'URL is required' })
    .url('Must be a valid URL')
    .max(2048, 'URL must not exceed 2048 characters'),
  customSlug: z
    .string()
    .regex(/^[a-zA-Z0-9-]{3,20}$/, 'Custom slug must be 3–20 alphanumeric characters')
    .optional(),
  expiresInDays: z
    .number()
    .int()
    .min(1, 'Expiry must be at least 1 day')
    .max(365, 'Expiry cannot exceed 365 days')
    .optional(),
});

export type CreateUrlBody = z.infer<typeof createUrlSchema>;
