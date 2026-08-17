# Novatis

Production-oriented digital banking and payment orchestration platform.

> **Important:** Novatis is software infrastructure. Real-world money movement requires licensed/regulated banking and payment partners, KYC/AML and sanctions controls, settlement arrangements, and jurisdiction-specific regulatory approval. The application does not bypass those requirements.

## Vision

Novatis provides a unified experience for holding accounts, managing beneficiaries, transferring funds, receiving funds, exchanging currencies, and tracking transactions across supported financial institutions and payment rails.

## Engineering goals

- Double-entry immutable ledger
- Local and international transfer orchestration
- Multi-currency accounts
- Provider-independent payment adapters
- Idempotent financial APIs
- Webhook and status reconciliation
- Fraud/risk controls
- KYC/AML integration points
- Strong authentication and authorization
- Auditability and operational tooling
- Fault tolerance and provider failure recovery
- Automated CI/security checks

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the target architecture, transaction lifecycle, reliability model, provider abstraction and production-readiness requirements.

## Development status

The repository is currently at the foundation stage. The next implementation milestones are identity/security, accounts, the double-entry ledger, internal transfers, provider adapters, reconciliation, and the operations console.

## Safety rule

No live banking credentials, payment-provider secrets, customer PII, card data, private keys or production database credentials belong in this repository.
