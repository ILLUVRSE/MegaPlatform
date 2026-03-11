# Prisma Migration Workflow

Canonical migration directory: `packages/db/migrations`

Do not add migrations under `packages/db/prisma/migrations`.

## Local workflow
1. Update `packages/db/schema.prisma`.
2. Generate migration:
   - `pnpm prisma:migrate -- --name <descriptive_name>`
3. Regenerate client:
   - `pnpm prisma:generate`
4. Validate and check status:
   - `pnpm db:migrations:lint`
   - `pnpm prisma:validate`
   - `pnpm prisma:migrate:status`

## Safety policy

- Migration folder names must follow: `YYYYMMDDHHMMSS_description`.
- Every migration directory must contain a non-empty `migration.sql`.
- `migration_lock.toml` must remain present in `packages/db/migrations`.
- Potentially destructive SQL is blocked by default in lint checks:
  - `DROP TABLE`
  - `DROP COLUMN`
  - `DROP SCHEMA`
  - `TRUNCATE`
  - `ALTER TABLE ... DROP CONSTRAINT`

If a destructive migration is intentionally required, add an explicit marker in that migration file:

```sql
-- MIGRATION_ALLOW_DESTRUCTIVE: <ticket/justification>
```

or run lint once with:

```bash
MIGRATION_LINT_ALLOW_DESTRUCTIVE=true pnpm db:migrations:lint
```

## CI workflow
CI must run all of:
- `pnpm db:migrations:lint`
- `pnpm prisma:generate`
- `pnpm prisma:validate`
- `pnpm prisma:migrate:status`

If `migrate status` reports drift or unapplied migration problems, fail the build.
