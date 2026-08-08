import type { z } from 'zod';
import { errors } from './errors';

export function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw errors.validation(result.error.flatten());
  }
  return result.data;
}
