# Novatis Implementation Roadmap

## Phase 1 — Foundation
- TypeScript monorepo
- API service and shared domain packages
- PostgreSQL migrations
- Redis/queue infrastructure abstraction
- Configuration and secrets interfaces
- Structured logging
- Health/readiness endpoints
- Unit/integration test foundation
- CI checks

## Phase 2 — Identity and security
- User registration/login
- Email/phone verification
- Argon2id password hashing
- MFA/OTP
- Session/device management
- RBAC
- Step-up authentication for sensitive operations
- Audit events

## Phase 3 — Core banking ledger
- Customers
- Accounts
- Currencies
- Chart of accounts
- Ledger transactions
- Debit/credit entries
- Holds/reservations
- Available vs ledger balance
- Balance snapshots
- Immutable financial records

## Phase 4 — Internal transfers
- Beneficiaries
- Account validation
- Transfer creation
- Idempotency
- Transaction state machine
- Fees
- Limits
- Notifications
- Transfer receipts

## Phase 5 — External local transfers
- Provider adapter contract
- Sandbox/mock provider
- Bank-account validation
- Submission
- Provider reference tracking
- Webhooks
- Status polling
- Timeouts/retries/circuit breakers
- Returns/reversals
- Reconciliation

## Phase 6 — International payments
- Multi-currency accounts
- FX quotes
- FX rate locking/expiry
- Corridor rules
- Beneficiary requirements by country
- International provider adapters
- SWIFT/ISO 20022/provider integration points as applicable
- Compliance screening hooks
- Correspondent/settlement status tracking

## Phase 7 — Risk and compliance
- KYC workflow
- KYB workflow
- Sanctions screening integration
- Transaction monitoring
- Velocity/risk rules
- Suspicious activity review queue
- Case management
- Compliance audit trail

## Phase 8 — Operations
- Customer support tools
- Transaction search
- Manual review queue
- Reconciliation dashboard
- Provider health dashboard
- Settlement reports
- Fee/revenue reports
- User/account controls

## Phase 9 — Production hardening
- Threat modeling
- SAST/dependency/container scanning
- Penetration testing
- Load and soak tests
- Backup/restore tests
- Disaster recovery
- Observability and alerting
- Key/secret rotation
- Incident response procedures

## Phase 10 — Production launch
Production launch is conditional on successful technical validation plus all required regulatory, licensing, banking-partner, payment-provider, KYC/AML, safeguarding/settlement, privacy and operational prerequisites.

## Non-negotiable financial invariants
1. Every posted ledger transaction balances to zero.
2. Ledger entries are immutable after posting.
3. Every external money-moving request has an idempotency key.
4. Provider timeouts never blindly trigger duplicate submission.
5. Provider acceptance is not equivalent to final settlement.
6. Every settlement difference enters reconciliation.
7. Every privileged financial action is auditable.
