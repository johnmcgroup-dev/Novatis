BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE customer_status AS ENUM ('PENDING','ACTIVE','SUSPENDED','CLOSED');
CREATE TYPE account_status AS ENUM ('PENDING','ACTIVE','FROZEN','CLOSED');
CREATE TYPE account_kind AS ENUM ('CUSTOMER','SYSTEM','CLEARING','SUSPENSE');
CREATE TYPE ledger_side AS ENUM ('DEBIT','CREDIT');
CREATE TYPE transfer_status AS ENUM ('INITIATED','VALIDATING','AUTHORIZED','PROCESSING','SUBMITTED','PROVIDER_ACCEPTED','SETTLED','FAILED','REJECTED','EXPIRED','CANCELLED','REVERSED','REQUIRES_REVIEW');
CREATE TYPE provider_attempt_status AS ENUM ('PENDING','SUBMITTED','ACCEPTED','FAILED','UNKNOWN');

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_number text NOT NULL UNIQUE,
  email citext UNIQUE,
  phone text UNIQUE,
  legal_name text,
  status customer_status NOT NULL DEFAULT 'PENDING',
  kyc_level text NOT NULL DEFAULT 'UNVERIFIED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  provider text NOT NULL,
  provider_subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_subject)
);

CREATE TABLE currencies (
  code char(3) PRIMARY KEY,
  exponent smallint NOT NULL CHECK (exponent BETWEEN 0 AND 6),
  active boolean NOT NULL DEFAULT true
);

INSERT INTO currencies(code, exponent) VALUES
('NGN',2),('USD',2),('EUR',2),('GBP',2)
ON CONFLICT DO NOTHING;

CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  account_number text NOT NULL UNIQUE,
  currency char(3) NOT NULL REFERENCES currencies(code),
  kind account_kind NOT NULL DEFAULT 'CUSTOMER',
  status account_status NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  CHECK ((kind = 'CUSTOMER' AND customer_id IS NOT NULL) OR kind <> 'CUSTOMER')
);

CREATE TABLE ledger_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE REFERENCES accounts(id),
  currency char(3) NOT NULL REFERENCES currencies(code),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  idempotency_key text UNIQUE,
  currency char(3) NOT NULL REFERENCES currencies(code),
  description text,
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id uuid NOT NULL REFERENCES journals(id) ON DELETE RESTRICT,
  ledger_account_id uuid NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  side ledger_side NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency char(3) NOT NULL REFERENCES currencies(code),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX postings_journal_idx ON postings(journal_id);
CREATE INDEX postings_account_idx ON postings(ledger_account_id, created_at);

CREATE TABLE holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency char(3) NOT NULL REFERENCES currencies(code),
  reference text NOT NULL UNIQUE,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  country_code char(2) NOT NULL,
  institution_name text NOT NULL,
  account_name text,
  account_identifier text NOT NULL,
  bank_code text,
  iban text,
  swift_bic text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  source_account_id uuid NOT NULL REFERENCES accounts(id),
  beneficiary_id uuid REFERENCES beneficiaries(id),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency char(3) NOT NULL REFERENCES currencies(code),
  fee_minor bigint NOT NULL DEFAULT 0 CHECK (fee_minor >= 0),
  status transfer_status NOT NULL DEFAULT 'INITIATED',
  idempotency_key text NOT NULL UNIQUE,
  client_reference text UNIQUE,
  provider_reference text,
  failure_code text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);

CREATE INDEX transfers_customer_idx ON transfers(customer_id, created_at DESC);
CREATE INDEX transfers_status_idx ON transfers(status, created_at);

CREATE TABLE provider_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES transfers(id),
  provider_name text NOT NULL,
  provider_reference text,
  idempotency_key text NOT NULL,
  status provider_attempt_status NOT NULL DEFAULT 'PENDING',
  request_hash text,
  submitted_at timestamptz,
  responded_at timestamptz,
  UNIQUE(provider_name, idempotency_key)
);

CREATE TABLE webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL,
  external_event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  signature_valid boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_name, external_event_id)
);

CREATE TABLE reconciliation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL,
  provider_reference text,
  transfer_id uuid REFERENCES transfers(id),
  expected_amount_minor bigint,
  actual_amount_minor bigint,
  currency char(3) REFERENCES currencies(code),
  matched boolean NOT NULL DEFAULT false,
  exception_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_customer_id uuid REFERENCES customers(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  correlation_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- A journal can only be posted when its postings balance exactly.
CREATE OR REPLACE FUNCTION assert_journal_balanced(p_journal uuid)
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  debit_total bigint;
  credit_total bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM journals WHERE id = p_journal AND posted_at IS NOT NULL) THEN
    SELECT COALESCE(SUM(amount_minor),0) INTO debit_total FROM postings WHERE journal_id=p_journal AND side='DEBIT';
    SELECT COALESCE(SUM(amount_minor),0) INTO credit_total FROM postings WHERE journal_id=p_journal AND side='CREDIT';
    IF debit_total = 0 OR debit_total <> credit_total THEN
      RAISE EXCEPTION 'journal % is not balanced', p_journal;
    END IF;
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER journal_balance_check
AFTER INSERT OR UPDATE ON journals
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION assert_journal_balanced(NEW.id);

COMMIT;
