# Novatis Banking Platform Architecture

## Purpose
Novatis is designed as a production-grade digital banking and payment orchestration platform. It is an orchestration layer and ledger platform; it does not itself bypass banks, payment networks, licensing, KYC/AML, sanctions screening, settlement, or regulatory controls.

## Core principles
- Double-entry, immutable financial ledger.
- Idempotent money movement APIs.
- Explicit transaction state machines.
- Provider abstraction for local and international payment rails.
- Never store card PAN/CVV unless a compliant card environment explicitly requires it; prefer tokenized providers.
- Secrets and credentials are never committed to source control.
- Every privileged and financial action is auditable.
- Reconciliation is a first-class subsystem, not an afterthought.
- External providers are treated as unreliable dependencies with timeouts, retries, circuit breakers and reconciliation.

## Target topology

```text
Web / Mobile Clients
        |
   API Gateway / WAF
        |
 Authentication & Authorization
        |
 +------+------+----------------+
 |             |                |
Accounts     Ledger        Transfer Orchestrator
 |             |                |
KYC/Risk      |        +-------+-------+
 |             |        |               |
Notifications |   Local Rails     International Rails
               |        |               |
               +---- Reconciliation ---+
                        |
                 Operations Console
```

## Financial transaction lifecycle
A transfer must not be modeled as a single database row with a mutable balance. Use a transaction aggregate plus immutable ledger entries.

Recommended states:

`INITIATED -> VALIDATING -> AUTHORIZED -> PROCESSING -> SUBMITTED -> PROVIDER_ACCEPTED -> SETTLED`

Failure paths include:

`FAILED`, `REJECTED`, `EXPIRED`, `CANCELLED`, `REVERSED`, and `REQUIRES_REVIEW`.

A provider timeout must never be treated as an automatic failure if the provider may have accepted the transaction. The system should reconcile by provider reference/idempotency key before retrying.

## Provider integration strategy
Implement a common adapter contract for:

- account verification
- beneficiary validation
- domestic transfer submission
- international transfer submission
- transfer status inquiry
- transaction cancellation where supported
- webhook verification and processing
- settlement/reconciliation files
- FX quote/rate retrieval

Provider-specific credentials, endpoints and quirks belong inside adapters. Business logic must depend on the adapter interface rather than a specific bank or processor.

## Local and international rails
Novatis should support regulated integrations appropriate to each operating market. For Nigeria this may include licensed banks/payment institutions and approved local payment rails; international corridors may require bank correspondents, regulated payment institutions, SWIFT/ISO 20022 connectivity, or specialist cross-border providers depending on the corridor.

The repository must contain sandbox adapters and mock providers before live credentials are introduced.

## Security baseline
- TLS everywhere.
- Strong password hashing using Argon2id.
- MFA/OTP and preferably passkeys for high-risk actions.
- Short-lived access tokens and rotating refresh tokens.
- Device/session management.
- Rate limiting and abuse prevention.
- Request signing for sensitive provider webhooks.
- Encryption for sensitive data at rest.
- Database least-privilege roles.
- PII minimization and retention controls.
- Secrets stored in a managed secret store in production.
- Dependency and container scanning in CI.
- No production credentials in `.env.example`, fixtures, logs, tests or Git history.

## Reliability
- Idempotency keys on every money-moving command.
- Database transactions around ledger writes.
- Outbox pattern for reliable asynchronous events.
- Queue-based provider submission where appropriate.
- Circuit breakers and exponential backoff.
- Dead-letter queues for unrecoverable messages.
- Provider reference tracking.
- Automated reconciliation.
- Immutable audit events.
- Operational alerts for stuck transactions and settlement mismatches.

## Compliance boundary
The application is not a substitute for regulatory authorization. Before production money movement, the operating entity must establish the applicable licensing, KYC/AML, sanctions screening, consumer protection, data protection, safeguarding/settlement, reporting and partner requirements for every target jurisdiction and corridor.

## Development phases
1. Repository foundation and architecture.
2. Identity, users, roles and security.
3. Accounts and double-entry ledger.
4. Internal transfers.
5. Provider abstraction and sandbox local transfers.
6. Webhooks, idempotency and reconciliation.
7. KYC/AML/risk workflow integration.
8. International transfer adapters and FX.
9. Operations/admin console.
10. Security testing, load testing, disaster recovery and production readiness.

## Definition of done for a money rail
A rail is not considered production-ready merely because an API returns success. It must have:

- authenticated provider communication
- request/response validation
- idempotency
- timeout handling
- retry policy
- webhook handling
- status polling where needed
- reconciliation support
- duplicate detection
- reversal/return handling
- operational monitoring
- auditability
- sandbox tests and failure simulations
- documented regulatory/partner prerequisites
