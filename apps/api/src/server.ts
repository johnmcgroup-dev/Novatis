import { createHash, randomUUID } from 'node:crypto';
import Fastify, { type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { z } from 'zod';
import { createDbPool, withTransaction } from './db/pool.js';
import { hashPassword, verifyPassword } from './auth/password.js';
import { createSessionToken, hashSessionToken } from './auth/session.js';
import { postBalancedTransfer } from './db/ledger.js';
import { createTransferStore } from './db/transfer-repository.js';
import { createInternalTransfer } from './transfers/internal-transfer.js';

const register = z.object({ email: z.string().email().max(320).transform((v) => v.toLowerCase()), password: z.string().min(12).max(256), phone: z.string().max(32).optional() });
const login = z.object({ email: z.string().email().max(320).transform((v) => v.toLowerCase()), password: z.string().min(1).max(256) });
const transfer = z.object({ sourceAccountId: z.string().uuid(), destinationAccountId: z.string().uuid(), amountMinor: z.coerce.bigint().positive(), currency: z.literal('NGN') });
const funding = z.object({ accountId: z.string().uuid(), amountMinor: z.coerce.bigint().positive() });
const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v)).digest('hex');

export async function buildApp() {
  const pool = createDbPool();
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info', redact: ['req.headers.authorization', 'password', 'token'] } });
  await app.register(helmet); await app.register(cors, { origin: false }); await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  app.addHook('onClose', async () => { await pool.end(); });
  app.setErrorHandler((error, _request, reply) => {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    const status = /Unauthorized|Invalid credentials|password/i.test(message) ? 401 : /not found|not owned|not active|Insufficient|Currency/i.test(message) ? 422 : /unique|duplicate|different request/i.test(message) ? 409 : 500;
    reply.code(status).send({ error: status === 500 ? 'Internal server error' : message });
  });
  async function currentCustomer(request: FastifyRequest): Promise<string> {
    const token = request.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) throw new Error('Unauthorized');
    const result = await pool.query<{ customer_id: string }>('SELECT customer_id FROM sessions WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now()', [hashSessionToken(token)]);
    const id = result.rows[0]?.customer_id; if (!id) throw new Error('Unauthorized'); return id;
  }
  app.get('/health/live', async () => ({ status: 'ok', service: 'novatis-api' }));
  app.post('/api/v1/customers/register', async (request, reply) => {
    const input = register.parse(request.body); const passwordHash = await hashPassword(input.password);
    const id = await withTransaction(pool, async (client) => {
      const customer = await client.query<{ id: string }>(`INSERT INTO customers(email,phone,status) VALUES ($1,$2,'ACTIVE') RETURNING id`, [input.email,input.phone ?? null]);
      const customerId = customer.rows[0]?.id; if (!customerId) throw new Error('Customer creation failed');
      await client.query('INSERT INTO identities(customer_id,password_hash) VALUES ($1,$2)', [customerId,passwordHash]); return customerId;
    });
    return reply.code(201).send({ customerId: id });
  });
  app.post('/api/v1/sessions/login', async (request) => {
    const input = login.parse(request.body);
    const found = await pool.query<{ customer_id: string; password_hash: string; locked_until: Date | null }>(`SELECT i.customer_id,i.password_hash,i.locked_until FROM identities i JOIN customers c ON c.id=i.customer_id WHERE c.email=$1 AND c.status='ACTIVE'`, [input.email]);
    const identity = found.rows[0]; const valid = !!identity && (!identity.locked_until || identity.locked_until < new Date()) && await verifyPassword(input.password,identity.password_hash);
    if (!valid) { if (identity) await pool.query(`UPDATE identities SET failed_login_count=failed_login_count+1,locked_until=CASE WHEN failed_login_count+1>=5 THEN now()+interval '15 minutes' ELSE locked_until END WHERE customer_id=$1`, [identity.customer_id]); throw new Error('Invalid credentials'); }
    await pool.query('UPDATE identities SET failed_login_count=0,locked_until=NULL WHERE customer_id=$1',[identity.customer_id]);
    const token=createSessionToken(); const expiresAt=new Date(Date.now()+604800000); await pool.query('INSERT INTO sessions(customer_id,token_hash,expires_at) VALUES ($1,$2,$3)',[identity.customer_id,hashSessionToken(token),expiresAt]);
    return { token,expiresAt:expiresAt.toISOString() };
  });
  app.post('/api/v1/accounts', async (request,reply) => { const customerId=await currentCustomer(request); const result=await pool.query<{id:string}>(`INSERT INTO ledger_accounts(customer_id,currency,account_type,status) VALUES ($1,'NGN','CUSTOMER','ACTIVE') RETURNING id`,[customerId]); return reply.code(201).send({accountId:result.rows[0]?.id,currency:'NGN'}); });
  app.get('/api/v1/accounts/:accountId/balance', async (request) => { const customerId=await currentCustomer(request); const accountId=z.string().uuid().parse((request.params as {accountId:string}).accountId); const result=await pool.query<{balance:string}>(`SELECT account_balance(id)::text AS balance FROM ledger_accounts WHERE id=$1 AND customer_id=$2`,[accountId,customerId]); if(!result.rows[0]) throw new Error('Account not found'); return {accountId,currency:'NGN',balanceMinor:result.rows[0].balance}; });
  app.post('/api/v1/sandbox/fund', async (request) => { if(!process.env.SANDBOX_FUNDING_KEY || request.headers['x-sandbox-key']!==process.env.SANDBOX_FUNDING_KEY) throw new Error('Unauthorized'); const customerId=await currentCustomer(request); const input=funding.parse(request.body); await withTransaction(pool,async(client)=>{const customer=await client.query('SELECT 1 FROM ledger_accounts WHERE id=$1 AND customer_id=$2 FOR UPDATE',[input.accountId,customerId]);if(!customer.rowCount)throw new Error('Account not found');const system=await client.query<{id:string}>(`INSERT INTO ledger_accounts(currency,account_type,status) VALUES ('NGN','SYSTEM','ACTIVE') RETURNING id`);const journal=await client.query<{id:string}>(`INSERT INTO journal_entries(reference_type,reference_id,description) VALUES ('SANDBOX_FUNDING',$1,'Sandbox funding only') RETURNING id`,[randomUUID()]);await client.query(`INSERT INTO postings(journal_entry_id,ledger_account_id,direction,amount_minor,currency) VALUES ($1,$2,'DEBIT',$3,'NGN'),($1,$4,'CREDIT',$3,'NGN')`,[journal.rows[0]?.id,system.rows[0]?.id,input.amountMinor.toString(),input.accountId]);});return{accountId:input.accountId,fundedMinor:input.amountMinor.toString(),mode:'sandbox'}; });
  app.post('/api/v1/transfers/internal', async (request) => { const customerId=await currentCustomer(request); const key=request.headers['idempotency-key']; if(typeof key!=='string')throw new Error('Invalid idempotency key');const input=transfer.parse(request.body);return withTransaction(pool,async(client)=>{const owner=await client.query('SELECT 1 FROM ledger_accounts WHERE id=$1 AND customer_id=$2',[input.sourceAccountId,customerId]);if(!owner.rowCount)throw new Error('Source account not owned by customer');const result=await createInternalTransfer(createTransferStore(client),{...input,idempotencyKey:key,fingerprint:fingerprint(input)});if(!result.replayed)await postBalancedTransfer(client,{transferId:result.transferId,...input});return{transferId:result.transferId,status:'SETTLED',replayed:result.replayed};}); });
  app.get('/api/v1/accounts/:accountId/transactions', async (request) => {const customerId=await currentCustomer(request);const accountId=z.string().uuid().parse((request.params as {accountId:string}).accountId);const result=await pool.query(`SELECT j.id,j.reference_type,j.reference_id,j.description,p.direction,p.amount_minor::text,p.currency,p.created_at FROM postings p JOIN journal_entries j ON j.id=p.journal_entry_id JOIN ledger_accounts a ON a.id=p.ledger_account_id WHERE a.id=$1 AND a.customer_id=$2 ORDER BY p.created_at DESC,p.id DESC LIMIT 100`,[accountId,customerId]);return{accountId,transactions:result.rows};});
  return app;
}
if (process.argv[1]?.endsWith('server.js') || process.argv[1]?.endsWith('server.ts')) { const app=await buildApp(); await app.listen({port:Number(process.env.PORT??3000),host:process.env.HOST??'0.0.0.0'}); }