import { createHash } from 'node:crypto';

export function requestFingerprint(input: unknown): string {
  const canonical = JSON.stringify(input, Object.keys((input ?? {}) as object).sort());
  return createHash('sha256').update(canonical).digest('hex');
}

export function assertIdempotencyKey(key: string): void {
  if (!/^[A-Za-z0-9._:-]{16,128}$/.test(key)) {
    throw new Error('Invalid idempotency key');
  }
}
