import { randomUUID } from 'node:crypto';
import { assertSameRequest, validateIdempotencyKey } from '../core/idempotency.js';
export interface TransferStore {
  findByIdempotencyKey(key: string): Promise<{ transferId: string; fingerprint: string } | null>;
  createInitiated(input: { transferId: string; idempotencyKey: string; fingerprint: string; sourceAccountId: string; destinationAccountId: string; amountMinor: bigint; currency: string }): Promise<void>;
  markSettled(transferId: string): Promise<void>;
}
export async function createInternalTransfer(store: TransferStore, input: { idempotencyKey: string; fingerprint: string; sourceAccountId: string; destinationAccountId: string; amountMinor: bigint; currency: string }) {
  validateIdempotencyKey(input.idempotencyKey);
  const previous = await store.findByIdempotencyKey(input.idempotencyKey);
  if (previous) { assertSameRequest(previous.fingerprint,input.fingerprint); return { transferId: previous.transferId,replayed:true }; }
  const transferId=randomUUID(); await store.createInitiated({...input,transferId}); await store.markSettled(transferId); return {transferId,replayed:false};
}