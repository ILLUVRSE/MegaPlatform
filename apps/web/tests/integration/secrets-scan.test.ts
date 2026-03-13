import { beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { scanRepository } from "../../../../tooling/security/secrets-scan.mjs";

function git(cwd: string, args: string[]) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

describe("secrets scan script", () => {
  let repoDir = "";

  beforeEach(() => {
    if (repoDir) {
      rmSync(repoDir, { recursive: true, force: true });
    }

    repoDir = mkdtempSync(path.join(os.tmpdir(), "illuvrse-secrets-scan-"));
    mkdirSync(path.join(repoDir, "docs"), { recursive: true });
    git(repoDir, ["init"]);
    git(repoDir, ["config", "user.name", "Codex"]);
    git(repoDir, ["config", "user.email", "codex@example.invalid"]);
    writeFileSync(path.join(repoDir, "README.md"), "# fixture\n");
    git(repoDir, ["add", "README.md"]);
    git(repoDir, ["commit", "-m", "init"]);
  });

  it("finds leaked secrets in repo history but ignores allowed placeholders", () => {
    writeFileSync(
      path.join(repoDir, "docs", "allowed.md"),
      'NEXTAUTH_SECRET="replace-with-a-long-random-string" // secret-scan: allow\n'
    );
    writeFileSync(path.join(repoDir, "leak.env"), 'OPENAI_API_KEY="sk-1234567890abcdefghijklmnop"\n');
    git(repoDir, ["add", "docs/allowed.md", "leak.env"]);
    git(repoDir, ["commit", "-m", "leak"]);
    git(repoDir, ["rm", "leak.env"]);
    git(repoDir, ["commit", "-m", "cleanup"]);

    const result = scanRepository(repoDir, { includeHistory: true, includeWorkingTree: true });

    expect(result.findings.some((entry) => entry.history && entry.type === "openai-key")).toBe(true);
    expect(result.findings.some((entry) => entry.source.includes("allowed.md"))).toBe(false);
  });

  it("blocks staged secrets before commit", () => {
    writeFileSync(path.join(repoDir, "pending.env"), 'GITHUB_TOKEN="ghp_1234567890abcdefghijklmnopqrstuv"\n');
    git(repoDir, ["add", "pending.env"]);

    const result = scanRepository(repoDir, { stagedOnly: true });

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "pending.env",
          type: "github-token"
        })
      ])
    );
  });
});
