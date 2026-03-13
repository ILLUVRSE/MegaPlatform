# Monetization

## Subscription trials

- `POST /api/subscription/subscribe` with `action: "start_trial"` creates a trial subscription ledger entry with:
  - trial start and end timestamps
  - a conversion reminder timestamp
  - explicit `autoConvertOptIn`
- `action: "send_reminder"` records the reminder once the reminder window opens.
- `action: "convert_trial"` settles the first paid invoice and marks the subscription `active`.
- `action: "cancel"` stops an in-flight trial before auto-convert and records the cancellation reason.

## Retry billing and dunning

- Billing retry policy lives in `packages/payments/retry-policy.mjs`.
- Retries use exponential backoff from a one-hour base delay and cap at five attempts.
- Failed conversion charges move a subscription into `past_due`, record the dunning stage, and schedule the next retry.
- Exhausted retries trigger `billing_dunning_exhausted`, which cancels the subscription and preserves the audit trail in the ledger events.

## Retention metrics

- Trial retention analytics are derived from subscription cohorts by `trialStartedAt` month.
- The admin monetization dashboard reads:
  - overview counts for total trials, paid, past due, cancelled, and converted
  - cohort conversion metrics for trial-to-paid retention
  - recent subscription rows and lifecycle events for operational review

## Operational follow-ups

- Legal review should confirm trial reminder copy, consent logging, and auto-renewal disclosures for target jurisdictions.
- Finance should align the dunning cadence with processor rules and refund/write-off handling before production processor wiring.
