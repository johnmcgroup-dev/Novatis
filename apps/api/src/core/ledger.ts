import { Money, assertSameCurrency } from './money.js';

export type LedgerLine = Readonly<{
  accountId: string;
  side: 'DEBIT' | 'CREDIT';
  money: Money;
}>;

export function validateBalancedJournal(lines: readonly LedgerLine[]): void {
  if (lines.length < 2) throw new Error('A journal requires at least two postings');

  const currencies = new Set(lines.map((line) => line.money.currency));
  if (currencies.size !== 1) throw new Error('A journal must contain one currency');

  let debits = 0n;
  let credits = 0n;
  for (const line of lines) {
    if (line.money.amountMinor <= 0n) throw new Error('Posting amount must be positive');
    if (line.side === 'DEBIT') debits += line.money.amountMinor;
    else credits += line.money.amountMinor;
  }
  if (debits !== credits) throw new Error('Journal is not balanced');
}

export function debit(accountId: string, value: Money): LedgerLine {
  if (!accountId) throw new Error('Account id is required');
  return { accountId, side: 'DEBIT', money: value };
}

export function credit(accountId: string, value: Money): LedgerLine {
  if (!accountId) throw new Error('Account id is required');
  return { accountId, side: 'CREDIT', money: value };
}
