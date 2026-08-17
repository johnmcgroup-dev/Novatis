export type LedgerSide = 'DEBIT' | 'CREDIT';

export interface PostingInput {
  ledgerAccountId: string;
  side: LedgerSide;
  amountMinor: bigint;
  currency: string;
}

export interface JournalInput {
  reference: string;
  idempotencyKey: string;
  currency: string;
  description?: string;
  postings: PostingInput[];
}

export function assertBalanced(postings: readonly PostingInput[]): void {
  if (postings.length < 2) {
    throw new Error('A journal requires at least two postings');
  }

  let debits = 0n;
  let credits = 0n;

  for (const posting of postings) {
    if (posting.amountMinor <= 0n) {
      throw new Error('Posting amount must be greater than zero');
    }

    if (posting.side === 'DEBIT') debits += posting.amountMinor;
    else credits += posting.amountMinor;
  }

  if (debits !== credits) {
    throw new Error(`Unbalanced journal: debits=${debits} credits=${credits}`);
  }
}

export function assertSameCurrency(postings: readonly PostingInput[], currency: string): void {
  if (postings.some((posting) => posting.currency !== currency)) {
    throw new Error('All postings in a journal must use the journal currency');
  }
}

export function validateJournal(input: JournalInput): void {
  if (!input.reference.trim()) throw new Error('Journal reference is required');
  if (!input.idempotencyKey.trim()) throw new Error('Idempotency key is required');
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error('Currency must be an ISO 4217 code');
  assertSameCurrency(input.postings, input.currency);
  assertBalanced(input.postings);
}
