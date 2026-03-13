#!/usr/bin/env node
// MIGRATION_ALLOW_DESTRUCTIVE: required marker for destructive migration overrides.
// See MIGRATIONS.md for policy and override instructions.
import { main } from "./db/migrations-lint.mjs";

main();
