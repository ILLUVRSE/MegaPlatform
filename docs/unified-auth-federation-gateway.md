# Unified Auth Federation Gateway

Phase 92 introduces a federated token issuance gateway with policy-bounded scopes.

## Policy

- `ops/governance/federation-gateway.json`

## API

- `POST /api/auth/federation/token`

The gateway grants scopes only when issuer is trusted and requested scopes are in policy allowlist.
