# Creator Economy

The creator tipping flow is file-backed and deterministic for local development, tests, and staging simulations.

## Tipping

- `POST /api/creator/tip` creates a tip atomically with an idempotency key.
- Fan wallets are debited once, creator pending payout balances are credited once, and clear tips emit payout queue events.
- Flagged tips are still recorded and credited to the creator pending balance, but they are held in review and do not enter payout batching.

## Fraud Review

- Lightweight heuristics score each tip on three signals: velocity spikes, IP/device mixing, and unusually large amount sizes.
- Tips at or above the risk threshold are written to the fraud review queue and marked with `payoutStatus: review`.

## Payouts

- `packages/payments/payouts.mjs` batches queued payout events by creator and runs them through the fake processor.
- Processor failures are retryable with exponential backoff, which keeps creator balances pending until the fake processor succeeds.
- `--dry-run` previews the next eligible batches without mutating queue or wallet state.
