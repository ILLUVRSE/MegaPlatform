#!/usr/bin/env node

function uniqueKeys(keys) {
  return Array.from(new Set(keys.map((key) => String(key).trim()).filter(Boolean)));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function invalidateCdnKeys({
  keys,
  requestId = `manual-${Date.now()}`,
  dryRun = false,
  fetchImpl = fetch
}) {
  const normalizedKeys = uniqueKeys(keys);
  if (normalizedKeys.length === 0) {
    return { ok: true, requestId, attempts: 0, keys: normalizedKeys, skipped: true };
  }

  if (dryRun || !process.env.CDN_INVALIDATION_URL) {
    return { ok: true, requestId, attempts: 0, keys: normalizedKeys, skipped: true };
  }

  const maxAttempts = Math.max(1, Number(process.env.CDN_INVALIDATION_ATTEMPTS ?? 3));
  const baseDelayMs = Math.max(100, Number(process.env.CDN_INVALIDATION_BASE_DELAY_MS ?? 250));
  const body = JSON.stringify({ requestId, keys: normalizedKeys });

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetchImpl(process.env.CDN_INVALIDATION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CDN_INVALIDATION_TOKEN ? { Authorization: `Bearer ${process.env.CDN_INVALIDATION_TOKEN}` } : {})
      },
      body
    });

    if (response.ok) {
      return { ok: true, requestId, attempts: attempt, keys: normalizedKeys };
    }

    if (attempt === maxAttempts) {
      throw new Error(`CDN invalidation failed with status ${response.status}`);
    }

    await sleep(baseDelayMs * 2 ** (attempt - 1));
  }

  throw new Error("CDN invalidation failed");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const keys = args.filter((arg) => arg !== "--dry-run");
  const result = await invalidateCdnKeys({ keys, dryRun });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
