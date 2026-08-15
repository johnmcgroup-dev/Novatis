import { describe, expect, it } from 'vitest';
import { money } from './money.js';
import { credit, debit, validateBalancedJournal } from './ledger.js';
import { canTransition, transition } from './transfer.js';
import { validateIdempotencyKey, assertSameRequest } from './idempotency.js';

describe('ledger invariants', () => {
  it('accepts balanced postings', () => {
    const value = money(10000n, 'NGN');
    expect(() => validateBalancedJournal([
      debit('cash', value),
      credit('customer', value),
    ])).not.toThrow();
  });

  it('rejects unbalanced postings', () => {
    const value = money(10000n, 'NGN');
    expect(() => validateBalancedJournal([
      debit('cash', value),
      credit('customer', money(9999n, 'NGN')),
    ])).toThrow('Journal is not balanced');
  });
});

describe('transfer state machine', () => {
  it('allows the normal settlement path', () => {
    expect(canTransition('INITIATED', 'VALIDATING')).toBe(true);
    expect(transition('PROVIDER_ACCEPTED', 'SETTLED')).toBe('SETTLED');
  });

  it('rejects illegal transitions', () => {
    expect(() => transition('SETTLED', 'PROCESSING')).toThrow('Invalid transfer transition');
  });
});

describe('idempotency', () => {
  it('validates a safe key', () => expect(() => validateIdempotencyKey('transfer:customer:2026-000001')).not.toThrow());
  it('rejects replay with a different request hash', () => {
    expect(() => assertSameRequest('a', 'b')).toThrow('different request');
  });
});
