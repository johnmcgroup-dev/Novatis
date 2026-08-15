import { z } from 'zod';

export const internalTransferSchema = z.object({
  sourceAccountId: z.string().uuid(),
  destinationAccountId: z.string().uuid(),
  amountMinor: z.coerce.bigint().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

export const idempotencyKeySchema = z.string().min(16).max(128).regex(/^[A-Za-z0-9._:-]+$/);
