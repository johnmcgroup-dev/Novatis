CREATE OR REPLACE FUNCTION journal_is_balanced(p_journal_id uuid) RETURNS boolean AS $$
DECLARE
  debit_total numeric(30,0);
  credit_total numeric(30,0);
BEGIN
  SELECT COALESCE(SUM(amount_minor) FILTER (WHERE direction='DEBIT'),0),
         COALESCE(SUM(amount_minor) FILTER (WHERE direction='CREDIT'),0)
  INTO debit_total, credit_total
  FROM postings
  WHERE journal_entry_id = p_journal_id;
  RETURN debit_total = credit_total AND debit_total > 0;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION account_balance(p_account_id uuid) RETURNS numeric(30,0) AS $$
DECLARE
  balance numeric(30,0);
BEGIN
  SELECT COALESCE(SUM(CASE WHEN direction='CREDIT' THEN amount_minor ELSE -amount_minor END),0)
    INTO balance
  FROM postings
  WHERE ledger_account_id = p_account_id;
  RETURN balance;
END;
$$ LANGUAGE plpgsql STABLE;
