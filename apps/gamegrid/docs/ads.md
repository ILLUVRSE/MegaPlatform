# Ads Hooks

Games can call optional non-blocking hooks:
- `window.gamegridAds?.requestInterstitial({ reason, gameId })`
- `window.gamegridAds?.requestRewarded({ reason, gameId })`

## Stub behavior
- Stub installer: `src/systems/ads.ts`
- Disabled by default (`ADS_STUB_ENABLED_DEFAULT = false`)
- If enabled, APIs resolve safely and never block gameplay.

## Contract
- Games must treat ads as optional and continue flow when hooks are absent.
