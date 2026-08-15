export type IdempotencyRecord = Readonly<{
  key: string;
  requestHash: string;
  responseStatus: number;
  responseBody: unknown;
}>;

export function validateIdempotencyKey(key: string): void {
  if (!/^[A-Za-z0-9._:-]{16,128}$/.test(key)) {
    throw new Error('Invalid idempotency key');
  }
}

export function assertSameRequest(existingHash: string, incomingHash: string): void {
  if (existingHash !== incomingHash) {
    throw new Error('Idempotency key was already used with a different request');
  }
}
