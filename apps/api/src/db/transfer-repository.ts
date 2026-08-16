import type { PoolClient } from 'pg';
import type { TransferStore } from '../transfers/internal-transfer.js';
import { findTransferByIdempotencyKey, insertInitiatedTransfer, markTransferSettled } from './queries.js';

export function createTransferStore(client: PoolClient): TransferStore {
  return {
    async findByIdempotencyKey(key) {
      const row = await findTransferByIdempotencyKey(client, key);
      return row ? { transferId: row.transfer_id, fingerprint: row.request_fingerprint } : null;
    },
    async createInitiated(input) {
      await insertInitiatedTransfer(client, input);
    },
    async markSettled(transferId) {
      await markTransferSettled(client, transferId);
    },
  };
}
