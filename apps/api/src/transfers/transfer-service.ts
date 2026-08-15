import { assertIdempotencyKey, requestFingerprint } from './idempotency.js';

export interface TransferCommand {
  sourceAccountId: string;
  destinationAccountId: string;
  amountMinor: bigint;
  currency: string;
  idempotencyKey: string;
}

export interface TransferReceipt {
  transferId: string;
  fingerprint: string;
  status: 'INITIATED';
}

export function validateTransfer(command: TransferCommand): TransferReceipt {
  assertIdempotencyKey(command.idempotencyKey);
  if (command.sourceAccountId === command.destinationAccountId) throw new Error('Source and destination accounts must differ');
  if (!Number.isSafeInteger(Number(command.amountMinor)) || command.amountMinor <= 0n) throw new Error('Amount must be a positive integer minor-unit value');
  if (!/^[A-Z]{3}$/.test(command.currency)) throw new Error('Currency must be an ISO-style three-letter code');
  return {
    transferId: crypto.randomUUID(),
    fingerprint: requestFingerprint({ ...command, amountMinor: command.amountMinor.toString() }),
    status: 'INITIATED',
  };
}
