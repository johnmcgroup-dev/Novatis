import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || password.length > 256) throw new Error('Password must be 12 to 256 characters');
  const salt = randomBytes(16).toString('base64url');
  const hash = await scrypt(password, salt, KEY_LENGTH) as Buffer;
  return `scrypt$${salt}$${hash.toString('base64url')}`;
}
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, salt, digest] = encoded.split('$');
  if (algorithm !== 'scrypt' || !salt || !digest) return false;
  const candidate = await scrypt(password, salt, KEY_LENGTH) as Buffer;
  const expected = Buffer.from(digest, 'base64url');
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}