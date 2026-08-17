import type { PoolClient } from 'pg';
export async function findTransferByIdempotencyKey(client: PoolClient, key: string) {
  const result = await client.query<{ transfer_id: string; request_fingerprint: string }>('SELECT id AS transfer_id, request_fingerprint FROM transfers WHERE idempotency_key=$1', [key]);
  return result.rows[0] ?? null;
}
export async function insertInitiatedTransfer(client: PoolClient, input: { transferId: string; idempotencyKey: string; fingerprint: string; sourceAccountId: string; destinationAccountId: string; amountMinor: bigint; currency: string }) {
  await client.query(`INSERT INTO transfers(id,idempotency_key,request_fingerprint,source_account_id,destination_account_id,amount_minor,currency,status) VALUES ($1,$2,$3,$4,$5,$6,$7,'PROCESSING')`, [input.transferId,input.idempotencyKey,input.fingerprint,input.sourceAccountId,input.destinationAccountId,input.amountMinor.toString(),input.currency]);
}
export async function markTransferSettled(client: PoolClient, transferId: string) { await client.query("UPDATE transfers SET status='SETTLED', updated_at=now() WHERE id=$1", [transferId]); }