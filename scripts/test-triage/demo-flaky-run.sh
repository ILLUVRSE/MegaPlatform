#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ITERATIONS="${1:-3}"

cd "$ROOT_DIR"

node scripts/test-triage/run-flaky-triage.mjs \
  --pattern "gamegrid/**/.*integration.test.ts" \
  --iterations "$ITERATIONS" \
  --output-dir "artifacts/flaky-triage/demo-$(date -u +%Y%m%dT%H%M%SZ)"
