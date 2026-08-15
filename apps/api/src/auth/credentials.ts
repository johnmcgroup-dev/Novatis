import { hashPassword, verifyPassword } from './password.js';

export interface CredentialStore {
  findPasswordHash(identityId: string): Promise<string | null>;
  savePasswordHash(identityId: string, passwordHash: string): Promise<void>;
}

export async function setPassword(store: CredentialStore, identityId: string, password: string): Promise<void> {
  await store.savePasswordHash(identityId, await hashPassword(password));
}

export async function authenticatePassword(store: CredentialStore, identityId: string, password: string): Promise<boolean> {
  const encoded = await store.findPasswordHash(identityId);
  if (!encoded) return false;
  return verifyPassword(password, encoded);
}
