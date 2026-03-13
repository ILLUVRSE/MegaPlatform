# Database Migration Policy

This package is the canonical source for Prisma schema and SQL migrations.

## Required commands

- Validate schema: `pnpm prisma:validate`
- Lint migration structure and destructive markers: `pnpm db:migrations:lint`
- Create the StudioAsset upload-tracking migration locally: `pnpm --filter @illuvrse/db prisma:migrate:studio`
- Deploy in non-dev environments: `pnpm --filter @illuvrse/db prisma:migrate:deploy`

## Naming rules

- Migration folders must use `YYYYMMDDHHMMSS_description`.
- Each folder must contain a non-empty `migration.sql`.
- Timestamps must be monotonic.

## Destructive SQL policy

Destructive statements are blocked by default by `scripts/db/migrations-lint.mjs`.

If a migration must contain destructive SQL:

1. Add an in-file justification comment in `migration.sql`:
   `-- MIGRATION_ALLOW_DESTRUCTIVE: <reason>`
2. If the destructive change is in the recent migration window (defaults to the latest 10 migrations), CI also requires `ALLOW_DESTRUCTIVE=true`.
3. Record the rollout and rollback plan in the pull request or issue.
4. Use `prisma:migrate:deploy` for non-dev deployment flows.

Current linted destructive patterns include:

- `DROP TABLE`
- `DROP COLUMN`
- `ALTER ... DROP` except for non-destructive cases like `DROP DEFAULT` and `DROP NOT NULL`
- `DROP SCHEMA`
- `TRUNCATE`
- `ALTER TABLE ... DROP CONSTRAINT`

## Review checklist

- Explain the user/data impact.
- Confirm forward-only deploy safety.
- Confirm rollback or restore procedure.
- Confirm application code is compatible with both pre- and post-deploy states when required.
