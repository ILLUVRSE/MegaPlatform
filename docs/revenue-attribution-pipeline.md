# Revenue Attribution Pipeline

Phase 66 introduces creator revenue attribution records and reporting.

## Data model

- `RevenueAttribution`
  - links to `CreatorProfile`
  - optional `shortPostId` and `projectId`
  - captures `actionType`, `eventSource`, `revenueCents`, and `metadataJson`

## Write path

- Shorts purchase API now writes attribution records on new paid purchases.
- Attribution links purchase events to the creator profile owning the short.

## Reporting

- Admin endpoint: `GET /api/admin/creator/revenue-attribution`
- Returns 30-day creator/action aggregates and totals for operational reporting.
