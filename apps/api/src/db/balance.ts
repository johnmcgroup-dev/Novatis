import type { PoolClient } from 'pg';

export async function getAccountBalance(client: PoolClient, accountId: string, _forUpdate = false): Promise<bigint> {
  const result = await client.query<{ balance: string }>(
    `SELECT COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount_minor ELSE -amount_minor END), 0)::text AS balance
       FROM postings WHERE ledger_account_id = $1`,
    [accountId],
  );
  return BigInt(result.rows[0]?.balance ?? '0');
}

export async function assertSufficientFunds(client: PoolClient, accountId: string, amountMinor: bigint): Promise<void> {
  const balance = await getAccountBalance(client, accountId, true);
  if (balance < amountMinor) throw new Error('Insufficient funds');
}