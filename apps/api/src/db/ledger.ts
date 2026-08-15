import type { PoolClient } from 'pg';

export async function postBalancedTransfer(client: PoolClient, input: {
  transferId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amountMinor: bigint;
  currency: string;
}) {
  if (input.amountMinor <= 0n) throw new Error('Amount must be positive');

  const accounts = await client.query<{ id: string; currency: string; status: string }>(
    `SELECT id, currency, status FROM ledger_accounts
     WHERE id IN ($1, $2) FOR UPDATE`,
    [input.sourceAccountId, input.destinationAccountId],
  );
  if (accounts.rowCount !== 2) throw new Error('Ledger account not found');

  const byId = new Map(accounts.rows.map((a) => [a.id, a]));
  const source = byId.get(input.sourceAccountId)!;
  const destination = byId.get(input.destinationAccountId)!;
  if (source.currency !== input.currency || destination.currency !== input.currency) throw new Error('Currency mismatch');
  if (source.status !== 'ACTIVE' || destination.status !== 'ACTIVE') throw new Error('Ledger account is not active');

  const journal = await client.query<{ id: string }>(
    `INSERT INTO journal_entries (reference_type, reference_id, description)
     VALUES ('TRANSFER', $1, 'Novatis internal transfer') RETURNING id`,
    [input.transferId],
  );
  const journalId = journal.rows[0]?.id;
  if (!journalId) throw new Error('Journal creation failed');

  await client.query(
    `INSERT INTO postings (journal_entry_id, ledger_account_id, direction, amount_minor, currency)
     VALUES ($1, $2, 'DEBIT', $3, $4), ($1, $5, 'CREDIT', $3, $4)`,
    [journalId, source.id, input.amountMinor.toString(), input.currency, destination.id],
  );
}
