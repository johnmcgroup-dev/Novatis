import { randomBytes, createHash } from 'node:crypto';

export interface SessionToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

export function createSessionToken(ttlSeconds = 900): SessionToken {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return { token, tokenHash, expiresAt: new Date(Date.now() + ttlSeconds * 1000) };
}
