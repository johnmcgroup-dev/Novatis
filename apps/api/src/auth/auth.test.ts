import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';
import { createSessionToken, hashSessionToken } from './session.js';

describe('credentials and sessions', () => {
  it('verifies only the password that produced the hash', async () => {
    const encoded = await hashPassword('correct horse battery staple');
    await expect(verifyPassword('correct horse battery staple', encoded)).resolves.toBe(true);
    await expect(verifyPassword('different password', encoded)).resolves.toBe(false);
  });
  it('does not persist a reusable session token', () => {
    const token = createSessionToken();
    expect(token).toHaveLength(43);
    expect(hashSessionToken(token)).not.toContain(token);
    expect(hashSessionToken(token)).toHaveLength(64);
  });
});