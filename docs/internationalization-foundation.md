# Internationalization Foundation

Phase 98 introduces locale and region foundations for the platform shell and key module paths.

## Policy Registry

- `ops/governance/i18n-foundation.json`

## API

- `POST /api/platform/i18n/resolve`

The resolver selects a supported locale from explicit locale or region defaults, then returns locale-aware paths for core modules.
