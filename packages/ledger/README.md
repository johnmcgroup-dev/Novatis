# @novatis/ledger

The ledger package will implement Novatis' immutable double-entry accounting core.

## Rules

1. Every posted transaction must balance: total debits = total credits.
2. Posted entries are immutable. Corrections are represented by reversal/adjustment entries.
3. Monetary values use integer minor units (for example, kobo/cents), never JavaScript floating point.
4. Currency is explicit on every monetary account and posting.
5. Available balance and ledger balance are separate concepts where holds/reservations are required.
6. Every external transfer must carry an idempotency key and provider reference when available.
7. Ledger posting occurs inside a database transaction.

The first implementation will expose typed commands for opening accounts, creating journal transactions, posting balanced entries, holds, releases, reversals and balance queries.
