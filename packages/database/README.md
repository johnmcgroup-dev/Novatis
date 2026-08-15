# @novatis/database

PostgreSQL persistence layer for Novatis.

Planned domains:

- users and identities
- customer profiles and KYC status
- devices and sessions
- accounts and currencies
- ledger accounts, journals and postings
- holds
- beneficiaries
- transfers and provider attempts
- fees and FX quotes
- webhooks
- reconciliation records
- audit events

The production database must use migrations, least-privilege roles, encrypted connections and automated backups with tested restoration procedures.
