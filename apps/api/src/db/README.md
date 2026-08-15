# Novatis PostgreSQL layer

The API database layer uses PostgreSQL transactions for financial commands.

Money-moving operations must execute the transfer record, account locks, journal creation, postings, and final transfer state change in one database transaction. If any operation fails, the complete command rolls back.

`FOR UPDATE` locks the source and destination ledger accounts during posting to provide a serialization boundary for concurrent balance-affecting operations.

Production requirements:

- TLS database connections
- least-privilege database role
- migrations only; no runtime schema mutation
- PITR-capable backups
- restore drills
- connection-pool limits
- statement/lock timeouts
- database monitoring
- encrypted backups
