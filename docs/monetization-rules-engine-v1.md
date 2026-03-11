# Monetization Rules Engine v1

Phase 65 centralizes premium/paywall policy decisions in a shared rules module.

## Engine

- `apps/web/lib/monetizationRules.ts`
  - `canAccessPremiumContent`
  - `normalizePremiumPrice`
  - `canPurchaseItem`

## Integrations

- Watch entitlement checks now call shared premium-access rules.
- Shorts monetize API now validates and clamps prices through shared rules.
- Shorts access/purchase APIs now use shared purchasability decisions.

This makes monetization behavior policy-driven and testable from one contract surface.
