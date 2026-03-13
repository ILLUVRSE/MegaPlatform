import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const cwd = process.cwd();
const pagesArg = process.argv.find((arg) => arg.startsWith("--pages="));
const pages = pagesArg ? pagesArg.split("=")[1].split(",").filter(Boolean) : ["top"];
const outputDir = path.join(cwd, "accessibility");
const vitestOutput = path.join(outputDir, ".top-flows-vitest.json");
const reportPath = path.join(outputDir, "audit-report.json");

mkdirSync(outputDir, { recursive: true });

const command = [
  "pnpm",
  "--filter",
  "@illuvrse/web",
  "exec",
  "vitest",
  "run",
  "--config",
  "tests/vitest.config.ts",
  "tests/accessibility/a11y.top-flows.test.ts",
  "--reporter=json",
  `--outputFile=${vitestOutput}`
];

const result = spawnSync(command[0], command.slice(1), {
  cwd,
  encoding: "utf8"
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

let vitestSummary = null;
if (existsSync(vitestOutput)) {
  vitestSummary = JSON.parse(readFileSync(vitestOutput, "utf8"));
}

const report = {
  generatedAt: new Date().toISOString(),
  auditMode: "axe-component-smoke",
  pages,
  command: command.join(" "),
  passed: result.status === 0,
  summary: vitestSummary
    ? {
        numTotalTests: vitestSummary.numTotalTests,
        numPassedTests: vitestSummary.numPassedTests,
        numFailedTests: vitestSummary.numFailedTests,
        numPendingTests: vitestSummary.numPendingTests,
        testResults: vitestSummary.testResults?.map((entry) => ({
          name: entry.name,
          status: entry.status,
          assertionResults: entry.assertionResults?.map((assertion) => ({
            title: assertion.title,
            status: assertion.status
          }))
        }))
      }
    : null,
  fixedIssues: [
    "Labeled party and game lobby form controls",
    "Removed nested button-inside-link pattern from watch poster cards",
    "Raised low-contrast helper text on watch, party, and studio surfaces",
    "Added stronger focus-visible treatment for core interactive elements",
    "Added status live regions for copy, studio, and publish feedback",
    "Added explicit carousel control labels and current-state semantics",
    "Added aria-current on active watch local navigation link",
    "Added link/button labels for recommendations and channel tiles",
    "Added accessible labels for studio publish and media controls",
    "Added automated top-flow axe coverage"
  ]
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
