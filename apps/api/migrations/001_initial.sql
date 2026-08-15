CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  phone text UNIQUE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','CLOSED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  account_type text NOT NULL CHECK (account_type IN ('CUSTOMER','SYSTEM','CLEARING','SUSPENSE')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','FROZEN','CLOSED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transfers (
  id uuid PRIMARY KEY,
  idempotency_key varchar(128) NOT NULL UNIQUE,
  request_fingerprint char(64) NOT NULL,
  source_account_id uuid NOT NULL REFERENCES ledger_accounts(id),
  destination_account_id uuid NOT NULL REFERENCES ledger_accounts(id),
  amount_minor numeric(30,0) NOT NULL CHECK (amount_minor > 0),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  status text NOT NULL CHECK (status IN ('INITIATED','PROCESSING','SUBMITTED','PROVIDER_ACCEPTED','SETTLED','FAILED','REJECTED','EXPIRED','CANCELLED','REVERSED','REQUIRES_REVIEW')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source_account_id <> destination_account_id)
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_type text NOT NULL,
  reference_id uuid NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid NOT NULL REFERENCES journal_entries(id),
  ledger_account_id uuid NOT NULL REFERENCES ledger_accounts(id),
  direction text NOT NULL CHECK (direction IN ('DEBIT','CREDIT')),
  amount_minor numeric(30,0) NOT NULL CHECK (amount_minor > 0),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_accounts_customer ON ledger_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_postings_account ON postings(ledger_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_source ON transfers(source_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_destination ON transfers(destination_account_id, created_at DESC);

CREATE OR REPLACE FUNCTION enforce_balanced_journal() RETURNS trigger AS $$
DECLARE
  debit_total numeric(30,0);
  credit_total numeric(30,0);
BEGIN
  SELECT COALESCE(SUM(amount_minor) FILTER (WHERE direction='DEBIT'),0),
         COALESCE(SUM(amount_minor) FILTER (WHERE direction='CREDIT'),0)
  INTO debit_total, credit_total
  FROM postings WHERE journal_entry_id = NEW.journal_entry_id;

  IF debit_total <> credit_total THEN
    RAISE EXCEPTION 'Journal % is not balanced: debits %, credits %', NEW.journal_entry_id, debit_total, credit_total;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Balance validation is intentionally performed by the application transaction after
-- all postings are inserted. A row-level trigger cannot validate a multi-row journal
-- while allowing the first posting to exist temporarily.
