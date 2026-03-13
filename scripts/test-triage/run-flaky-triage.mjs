#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';
import os from 'node:os';

const REPO_ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..', '..');
const DEFAULT_OUTPUT_DIR = join(REPO_ROOT, 'artifacts', 'flaky-triage', timestampForPath(new Date()));
const DEFAULT_ITERATIONS = 5;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const matchedFiles = collectCandidateTests(options.pattern);

  if (matchedFiles.length === 0) {
    console.error(`No tests matched pattern "${options.pattern}".`);
    process.exitCode = 1;
    return;
  }

  mkdirSync(options.outputDir, { recursive: true });

  const runManifest = {
    generatedAt: new Date().toISOString(),
    repoRoot: REPO_ROOT,
    options: {
      pattern: options.pattern,
      iterations: options.iterations,
      outputDir: options.outputDir,
      baseSeed: options.baseSeed
    },
    environment: collectEnvironmentMetadata()
  };

  writeJson(join(options.outputDir, 'manifest.json'), runManifest);

  const summaries = [];
  for (const testFile of matchedFiles) {
    summaries.push(await triageTestFile(testFile, options));
  }

  const summary = buildSummary(runManifest, summaries);
  writeJson(join(options.outputDir, 'summary.json'), summary);
  writeFileSync(join(options.outputDir, 'summary.md'), formatMarkdownSummary(summary));

  console.log(`Flaky triage complete. Matched ${matchedFiles.length} test file(s).`);
  console.log(`Artifacts: ${options.outputDir}`);
  console.log(`Summary: ${join(options.outputDir, 'summary.md')}`);

  const hasFailures = summaries.some((entry) => entry.failCount > 0);
  process.exitCode = hasFailures ? 2 : 0;
}

function parseArgs(argv) {
  const options = {
    pattern: '',
    iterations: DEFAULT_ITERATIONS,
    outputDir: DEFAULT_OUTPUT_DIR,
    baseSeed: Math.floor(Math.random() * 0xffffffff) >>> 0
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--pattern') {
      options.pattern = argv[++index] ?? '';
      continue;
    }
    if (arg === '--iterations') {
      options.iterations = Number.parseInt(argv[++index] ?? '', 10);
      continue;
    }
    if (arg === '--output-dir') {
      options.outputDir = resolve(REPO_ROOT, argv[++index] ?? '');
      continue;
    }
    if (arg === '--seed' || arg === '--base-seed') {
      options.baseSeed = Number.parseInt(argv[++index] ?? '', 10) >>> 0;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.pattern) {
    throw new Error('Missing required --pattern argument.');
  }

  if (!Number.isInteger(options.iterations) || options.iterations <= 0) {
    throw new Error(`Invalid --iterations value: ${options.iterations}`);
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/test-triage/run-flaky-triage.mjs --pattern "<glob>" [--iterations 10] [--output-dir artifacts/flaky-triage/custom] [--seed 1234]
`);
}

function collectCandidateTests(pattern) {
  const normalizedPattern = normalizePath(pattern);
  const strictMatcher = globToRegExp(normalizedPattern);
  const looseMatcher = loosePatternToRegExp(normalizedPattern);
  const files = walkTests(join(REPO_ROOT, 'apps'));

  return files.filter((filePath) => {
    const repoRelative = normalizePath(relative(REPO_ROOT, filePath));
    const appsRelative = repoRelative.startsWith('apps/') ? repoRelative.slice('apps/'.length) : repoRelative;
    return (
      strictMatcher.test(repoRelative) ||
      strictMatcher.test(appsRelative) ||
      looseMatcher.test(repoRelative) ||
      looseMatcher.test(appsRelative)
    );
  });
}

function walkTests(rootDir) {
  const results = [];
  const queue = [rootDir];

  while (queue.length > 0) {
    const currentDir = queue.pop();
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage' || entry.name.startsWith('.')) {
        continue;
      }

      const absolutePath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        queue.push(absolutePath);
        continue;
      }

      if (entry.isFile() && isTestFile(absolutePath)) {
        results.push(absolutePath);
      }
    }
  }

  return results.sort();
}

function isTestFile(filePath) {
  return /\.(test|spec)\.[cm]?[jt]sx?$/.test(filePath);
}

async function triageTestFile(testFile, options) {
  const repoRelative = normalizePath(relative(REPO_ROOT, testFile));
  const appRoot = resolveAppRoot(testFile);
  const packageJson = JSON.parse(readFileSync(join(appRoot, 'package.json'), 'utf8'));
  const appName = packageJson.name ?? basename(appRoot);
  const testRelativeToApp = normalizePath(relative(appRoot, testFile));
  const testOutputDir = join(options.outputDir, slugify(repoRelative));

  mkdirSync(testOutputDir, { recursive: true });

  const runs = [];
  for (let runIndex = 1; runIndex <= options.iterations; runIndex += 1) {
    const seed = computeRunSeed(options.baseSeed, repoRelative, runIndex);
    const runOutputDir = join(testOutputDir, `run-${String(runIndex).padStart(2, '0')}`);
    mkdirSync(runOutputDir, { recursive: true });

    const result = await executeVitestRun({
      appRoot,
      testRelativeToApp,
      seed,
      runIndex,
      runOutputDir
    });

    writeJson(join(runOutputDir, 'metadata.json'), result.metadata);
    writeFileSync(join(runOutputDir, 'stdout.log'), result.stdout);
    writeFileSync(join(runOutputDir, 'stderr.log'), result.stderr);
    writeJson(join(runOutputDir, 'result.json'), result.normalizedResult);
    captureSnapshotArtifacts(testFile, join(runOutputDir, 'snapshots'));

    runs.push(result);
  }

  const summary = summarizeTestRuns({
    appName,
    appRoot,
    testFile,
    repoRelative,
    iterations: options.iterations,
    runs
  });

  writeJson(join(testOutputDir, 'test-summary.json'), summary);
  return summary;
}

function resolveAppRoot(testFile) {
  const segments = testFile.split(sep);
  const appsIndex = segments.lastIndexOf('apps');
  if (appsIndex === -1 || appsIndex + 1 >= segments.length) {
    throw new Error(`Unable to resolve app root for ${testFile}`);
  }

  return segments.slice(0, appsIndex + 2).join(sep);
}

async function executeVitestRun({ appRoot, testRelativeToApp, seed, runIndex, runOutputDir }) {
  const reportPath = join(runOutputDir, 'vitest-report.json');
  const startedAt = new Date();
  const hrStart = process.hrtime.bigint();
  const env = {
    ...process.env,
    CI: process.env.CI ?? '1',
    FORCE_COLOR: '0',
    TZ: process.env.TZ ?? 'UTC',
    FLAKY_TRIAGE_SEED: String(seed),
    TEST_RANDOM_SEED: String(seed),
    FLAKY_TRIAGE_RUN_INDEX: String(runIndex)
  };

  const args = [
    '--dir',
    appRoot,
    'exec',
    'vitest',
    'run',
    testRelativeToApp,
    '--reporter=json',
    '--outputFile',
    reportPath
  ];

  const { exitCode, stdout, stderr } = await spawnCommand('pnpm', args, { cwd: REPO_ROOT, env });
  const finishedAt = new Date();
  const durationMs = Number(process.hrtime.bigint() - hrStart) / 1_000_000;

  const report = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, 'utf8')) : null;
  const normalizedResult = normalizeVitestReport(report, { exitCode, stdout, stderr });

  const metadata = {
    seed,
    runIndex,
    appRoot,
    testRelativeToApp,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs,
    exitCode,
    env: {
      CI: env.CI,
      TZ: env.TZ,
      FLAKY_TRIAGE_SEED: env.FLAKY_TRIAGE_SEED,
      TEST_RANDOM_SEED: env.TEST_RANDOM_SEED,
      FLAKY_TRIAGE_RUN_INDEX: env.FLAKY_TRIAGE_RUN_INDEX,
      NODE_ENV: env.NODE_ENV ?? null
    },
    system: collectEnvironmentMetadata()
  };

  return {
    stdout,
    stderr,
    metadata,
    normalizedResult
  };
}

function normalizeVitestReport(report, fallback) {
  if (!report) {
    return {
      status: fallback.exitCode === 0 ? 'passed' : 'failed',
      stats: null,
      failures: [
        {
          suite: 'runner',
          testName: 'vitest invocation',
          status: fallback.exitCode === 0 ? 'passed' : 'failed',
          stack: fallback.stderr || fallback.stdout || 'Vitest report was not generated.',
          failureMessages: [fallback.stderr || fallback.stdout || 'Vitest report was not generated.']
        }
      ]
    };
  }

  const failures = [];
  for (const suite of report.testResults ?? []) {
    for (const assertion of suite.assertionResults ?? []) {
      if (assertion.status === 'failed') {
        failures.push({
          suite: suite.name,
          testName: assertion.fullName,
          status: assertion.status,
          duration: assertion.duration ?? null,
          stack: (assertion.failureMessages ?? []).join('\n\n'),
          failureMessages: assertion.failureMessages ?? []
        });
      }
    }
  }

  if (failures.length === 0 && !report.success && (report.testResults ?? []).length > 0) {
    for (const suite of report.testResults) {
      if (suite.status === 'failed' && suite.message) {
        failures.push({
          suite: suite.name,
          testName: basename(suite.name),
          status: suite.status,
          duration: suite.endTime && suite.startTime ? suite.endTime - suite.startTime : null,
          stack: suite.message,
          failureMessages: [suite.message]
        });
      }
    }
  }

  return {
    status: report.success ? 'passed' : 'failed',
    stats: {
      numTotalTests: report.numTotalTests ?? 0,
      numPassedTests: report.numPassedTests ?? 0,
      numFailedTests: report.numFailedTests ?? 0,
      startTime: report.startTime ?? null,
      snapshot: report.snapshot ?? null
    },
    failures
  };
}

function captureSnapshotArtifacts(testFile, outputDir) {
  const snapshotCandidates = [];
  const baseName = basename(testFile);
  const snapName = `${baseName}.snap`;
  const testDir = dirname(testFile);
  const siblingSnap = join(testDir, '__snapshots__', snapName);
  const colocatedSnap = join(testDir, snapName);

  if (existsSync(siblingSnap)) {
    snapshotCandidates.push(siblingSnap);
  }
  if (existsSync(colocatedSnap)) {
    snapshotCandidates.push(colocatedSnap);
  }

  if (snapshotCandidates.length === 0) {
    return;
  }

  mkdirSync(outputDir, { recursive: true });
  for (const snapshotPath of snapshotCandidates) {
    cpSync(snapshotPath, join(outputDir, basename(snapshotPath)));
  }
}

function summarizeTestRuns({ appName, appRoot, testFile, repoRelative, iterations, runs }) {
  const runSummaries = runs.map((run) => {
    const failed = run.normalizedResult.failures.length > 0 || run.normalizedResult.status === 'failed';
    return {
      runIndex: run.metadata.runIndex,
      seed: run.metadata.seed,
      status: failed ? 'failed' : 'passed',
      durationMs: run.metadata.durationMs,
      exitCode: run.metadata.exitCode,
      failureCount: run.normalizedResult.failures.length,
      failures: run.normalizedResult.failures
    };
  });

  const failCount = runSummaries.filter((run) => run.status === 'failed').length;
  const passCount = iterations - failCount;
  const flakeRate = iterations === 0 ? 0 : failCount / iterations;
  const failureText = runSummaries
    .flatMap((run) => run.failures)
    .map((failure) => `${failure.testName}\n${failure.stack}`)
    .join('\n\n');

  const hints = inferRootCauseHints({
    flakeRate,
    failureText,
    runSummaries
  });

  return {
    appName,
    appRoot,
    testFile,
    repoRelative,
    iterations,
    passCount,
    failCount,
    flakeRate,
    averageDurationMs: average(runSummaries.map((run) => run.durationMs)),
    minDurationMs: Math.min(...runSummaries.map((run) => run.durationMs)),
    maxDurationMs: Math.max(...runSummaries.map((run) => run.durationMs)),
    candidateRootCauseHints: hints,
    runs: runSummaries
  };
}

function inferRootCauseHints({ flakeRate, failureText, runSummaries }) {
  const text = failureText.toLowerCase();
  const hints = new Set();

  if (flakeRate > 0 && flakeRate < 1) {
    hints.add('Intermittent failure pattern detected; investigate order dependence or async race conditions.');
  }
  if (flakeRate === 1) {
    hints.add('Failure reproduced on every iteration; this looks deterministic rather than flaky.');
  }
  if (runSummaries.length > 1) {
    const durations = runSummaries.map((run) => run.durationMs);
    const mean = average(durations);
    const max = Math.max(...durations);
    const min = Math.min(...durations);
    if (mean > 0 && (max - min) / mean > 0.5) {
      hints.add('Run duration varies significantly; resource contention or timing sensitivity is plausible.');
    }
  }
  if (/snapshot/i.test(text) || /to match snapshot/i.test(text)) {
    hints.add('Snapshot mismatch detected; inspect serialized output and snapshot update discipline.');
  }
  if (/timeout|timed out|exceeded/i.test(text)) {
    hints.add('Timeout-like failure detected; async completion or environment performance may be involved.');
  }
  if (/random|rng|seed|nondetermin/i.test(text)) {
    hints.add('Failure mentions randomness or determinism; compare behavior across recorded seeds.');
  }
  if (/date|timezone|locale|intl|utc/i.test(text)) {
    hints.add('Time or locale-sensitive behavior is implicated; validate timezone and clock assumptions.');
  }
  if (/jsdom|document is not defined|window is not defined|navigator/i.test(text)) {
    hints.add('Environment mismatch detected; verify browser vs node assumptions in the test setup.');
  }
  if (/not equal|toequal|received|expected|assertionerror/i.test(text) && flakeRate > 0 && flakeRate < 1) {
    hints.add('Assertion output changes across iterations; shared mutable state or ordering could be leaking in.');
  }
  if (hints.size === 0) {
    hints.add('No root-cause hint detected from current traces.');
  }

  return Array.from(hints);
}

function buildSummary(manifest, tests) {
  const totalRuns = tests.reduce((sum, test) => sum + test.iterations, 0);
  const totalFailures = tests.reduce((sum, test) => sum + test.failCount, 0);

  return {
    ...manifest,
    totals: {
      matchedTests: tests.length,
      totalRuns,
      totalFailures,
      overallFlakeRate: totalRuns === 0 ? 0 : totalFailures / totalRuns
    },
    tests: tests
      .slice()
      .sort((left, right) => right.flakeRate - left.flakeRate || left.repoRelative.localeCompare(right.repoRelative))
  };
}

function formatMarkdownSummary(summary) {
  const lines = [];
  lines.push('# Flaky Test Triage Summary');
  lines.push('');
  lines.push(`- Generated: ${summary.generatedAt}`);
  lines.push(`- Pattern: \`${summary.options.pattern}\``);
  lines.push(`- Iterations per test: ${summary.options.iterations}`);
  lines.push(`- Matched tests: ${summary.totals.matchedTests}`);
  lines.push(`- Total runs: ${summary.totals.totalRuns}`);
  lines.push(`- Total failures: ${summary.totals.totalFailures}`);
  lines.push(`- Overall flake rate: ${(summary.totals.overallFlakeRate * 100).toFixed(1)}%`);
  lines.push('');

  for (const test of summary.tests) {
    lines.push(`## ${test.repoRelative}`);
    lines.push('');
    lines.push(`- App: ${test.appName}`);
    lines.push(`- Pass/Fail: ${test.passCount}/${test.failCount}`);
    lines.push(`- Flake rate: ${(test.flakeRate * 100).toFixed(1)}%`);
    lines.push(`- Duration range: ${Math.round(test.minDurationMs)}-${Math.round(test.maxDurationMs)}ms`);
    lines.push(`- Root cause hints: ${test.candidateRootCauseHints.join(' | ')}`);
    const failedRuns = test.runs.filter((run) => run.status === 'failed');
    if (failedRuns.length > 0) {
      lines.push('- Failed runs:');
      for (const run of failedRuns) {
        const firstFailure = run.failures[0];
        lines.push(`  - run ${run.runIndex} seed=${run.seed}: ${firstFailure?.testName ?? 'unknown failure'}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

function collectEnvironmentMetadata() {
  return {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpuCount: os.cpus().length,
    hostname: os.hostname()
  };
}

function computeRunSeed(baseSeed, filePath, runIndex) {
  return (baseSeed ^ hashString(`${filePath}:${runIndex}`)) >>> 0;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function timestampForPath(date) {
  return date.toISOString().replaceAll(':', '').replaceAll('.', '-');
}

function normalizePath(value) {
  return value.replaceAll('\\', '/');
}

function slugify(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function globToRegExp(globPattern) {
  let pattern = '^';
  for (let index = 0; index < globPattern.length; index += 1) {
    const char = globPattern[index];
    const next = globPattern[index + 1];

    if (char === '*') {
      if (next === '*') {
        pattern += '.*';
        index += 1;
      } else {
        pattern += '[^/]*';
      }
      continue;
    }

    if (char === '?') {
      pattern += '[^/]';
      continue;
    }

    pattern += escapeRegExp(char);
  }

  pattern += '$';
  return new RegExp(pattern);
}

function loosePatternToRegExp(pattern) {
  let source = normalizePath(pattern);
  source = source.replace(/[|\\{}()[\]^$+?]/g, '\\$&');
  source = source.replaceAll('**/', '(?:.*/)?');
  source = source.replaceAll('**', '.*');
  source = source.replaceAll('*', '.*');
  return new RegExp(`^${source}$`);
}

function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function writeJson(filePath, payload) {
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function spawnCommand(command, args, options) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, options);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', rejectPromise);
    child.on('close', (exitCode) => {
      resolvePromise({
        exitCode: exitCode ?? 1,
        stdout,
        stderr
      });
    });
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
