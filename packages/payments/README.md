# @novatis/payments

Provider-independent transfer orchestration.

A provider adapter must support, where the underlying rail allows it:

- beneficiary/account validation
- transfer submission
- status inquiry
- cancellation/recall
- webhook verification
- reconciliation

The orchestration layer owns Novatis transaction state and idempotency. Provider adapters translate that state to external APIs and never mutate the ledger directly.
