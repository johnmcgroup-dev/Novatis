import { describe, expect, it, vi } from 'vitest';
import { executeInternalTransfer } from './internal-transfer.js';

const command = {
  sourceAccountId: 'acc-source',
  destinationAccountId: 'acc-destination',
  amountMinor: 10000n,
  currency: 'NGN',
  idempotencyKey: 'transfer-20260815-000001',
};

describe('internal transfer orchestration', () => {
  it('posts and settles a new transfer', async () => {
    const store = {
      findByIdempotencyKey: vi.fn().mockResolvedValue(null),
      createInitiated: vi.fn().mockResolvedValue(undefined),
      markSettled: vi.fn().mockResolvedValue(undefined),
    };
    const ledger = { postBalancedTransfer: vi.fn().mockResolvedValue(undefined) };

    const result = await executeInternalTransfer(command, store, ledger);

    expect(result.status).toBe('SETTLED');
    expect(store.createInitiated).toHaveBeenCalledOnce();
    expect(ledger.postBalancedTransfer).toHaveBeenCalledOnce();
    expect(store.markSettled).toHaveBeenCalledOnce();
  });

  it('returns the existing transfer for an identical retry', async () => {
    const store = {
      findByIdempotencyKey: vi.fn().mockResolvedValue({
        fingerprint: 'unused',
        transferId: 'existing-transfer',
      }),
      createInitiated: vi.fn(),
      markSettled: vi.fn(),
    };
    const ledger = { postBalancedTransfer: vi.fn() };

    // The fingerprint is intentionally obtained from the first command execution.
    const firstStore = {
      findByIdempotencyKey: vi.fn().mockResolvedValue(null),
      createInitiated: vi.fn().mockResolvedValue(undefined),
      markSettled: vi.fn().mockResolvedValue(undefined),
    };
    const first = await executeInternalTransfer(command, firstStore, ledger);
    store.findByIdempotencyKey.mockResolvedValue({ fingerprint: firstStore.createInitiated.mock.calls[0][0].fingerprint, transferId: first.transferId });

    const retry = await executeInternalTransfer(command, store, ledger);
    expect(retry.status).toBe('EXISTING');
    expect(retry.transferId).toBe(first.transferId);
    expect(store.createInitiated).not.toHaveBeenCalled();
  });

  it('rejects reuse of an idempotency key for changed data', async () => {
    const store = {
      findByIdempotencyKey: vi.fn().mockResolvedValue({ fingerprint: 'different-request', transferId: 'existing-transfer' }),
      createInitiated: vi.fn(),
      markSettled: vi.fn(),
    };
    const ledger = { postBalancedTransfer: vi.fn() };

    await expect(executeInternalTransfer(command, store, ledger)).rejects.toThrow('different request');
    expect(ledger.postBalancedTransfer).not.toHaveBeenCalled();
  });
});
