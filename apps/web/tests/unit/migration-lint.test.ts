import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("migration lint policy", () => {
  it("documents destructive migration markers in the lint script and linked db policy", () => {
    const script = readFileSync(path.join(process.cwd(), "..", "..", "scripts", "check-db-migrations.mjs"), "utf8");
    const docs = readFileSync(path.join(process.cwd(), "..", "..", "packages", "db", "MIGRATIONS.md"), "utf8");
    expect(script).toContain("MIGRATION_ALLOW_DESTRUCTIVE:");
    expect(script).toContain("See MIGRATIONS.md for policy and override instructions.");
    expect(docs).toContain("pnpm --filter @illuvrse/db prisma:migrate:deploy");
    expect(docs).toContain("MIGRATION_ALLOW_DESTRUCTIVE:");
  });
});
