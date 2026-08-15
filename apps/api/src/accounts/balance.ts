export interface Posting {
  direction: 'DEBIT' | 'CREDIT';
  amountMinor: bigint;
}

export function calculateLedgerBalance(postings: readonly Posting[]): bigint {
  return postings.reduce((balance, posting) => posting.direction === 'CREDIT'
    ? balance + posting.amountMinor
    : balance - posting.amountMinor, 0n);
}

export function assertSufficientFunds(balanceMinor: bigint, amountMinor: bigint): void {
  if (amountMinor <= 0n) throw new Error('Amount must be positive');
  if (balanceMinor < amountMinor) throw new Error('Insufficient funds');
}
