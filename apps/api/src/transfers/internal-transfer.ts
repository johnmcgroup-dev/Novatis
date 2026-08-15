import { validateTransfer, type TransferCommand } from './transfer-service.js';

export interface LedgerPoster {
  postBalancedTransfer(input: {
    transferId: string;
    sourceAccountId: string;
    destinationAccountId: string;
    amountMinor: bigint;
    currency: string;
  }): Promise<void>;
}

export interface TransferStore {
  findByIdempotencyKey(key: string): Promise<{ fingerprint: string; transferId: string } | null>;
  createInitiated(input: {
    transferId: string;
    idempotencyKey: string;
    fingerprint: string;
    sourceAccountId: string;
    destinationAccountId: string;
    amountMinor: bigint;
    currency: string;
  }): Promise<void>;
  markSettled(transferId: string): Promise<void>;
}

export async function executeInternalTransfer(
  command: TransferCommand,
  store: TransferStore,
  ledger: LedgerPoster,
) {
  const validated = validateTransfer(command);
  const existing = await store.findByIdempotencyKey(command.idempotencyKey);

  if (existing) {
    if (existing.fingerprint !== validated.fingerprint) {
      throw new Error('Idempotency key already belongs to a different request');
    }
    return { transferId: existing.transferId, status: 'EXISTING' as const };
  }

  await store.createInitiated({
    transferId: validated.transferId,
    idempotencyKey: command.idempotencyKey,
    fingerprint: validated.fingerprint,
    sourceAccountId: command.sourceAccountId,
    destinationAccountId: command.destinationAccountId,
    amountMinor: command.amountMinor,
    currency: command.currency,
  });

  await ledger.postBalancedTransfer({
    transferId: validated.transferId,
    sourceAccountId: command.sourceAccountId,
    destinationAccountId: command.destinationAccountId,
    amountMinor: command.amountMinor,
    currency: command.currency,
  });

  await store.markSettled(validated.transferId);
  return { transferId: validated.transferId, status: 'SETTLED' as const };
}
