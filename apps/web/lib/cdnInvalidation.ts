type InvalidateResult = {
  ok: boolean;
  requestId: string;
  skipped?: boolean;
  attempts: number;
  keys: string[];
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uniqueKeys(keys: string[]) {
  return Array.from(new Set(keys.map((key) => key.trim()).filter(Boolean)));
}

export async function invalidateCdnKeysWithRetry(input: {
  keys: string[];
  requestId: string;
  dryRun?: boolean;
  fetchImpl?: typeof fetch;
}) {
  const keys = uniqueKeys(input.keys);
  if (keys.length === 0) {
    return {
      ok: true,
      requestId: input.requestId,
      skipped: true,
      attempts: 0,
      keys
    } satisfies InvalidateResult;
  }

  if (input.dryRun || !process.env.CDN_INVALIDATION_URL) {
    return {
      ok: true,
      requestId: input.requestId,
      skipped: true,
      attempts: 0,
      keys
    } satisfies InvalidateResult;
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const maxAttempts = Math.max(1, Number(process.env.CDN_INVALIDATION_ATTEMPTS ?? 3));
  const baseDelayMs = Math.max(100, Number(process.env.CDN_INVALIDATION_BASE_DELAY_MS ?? 250));
  const body = JSON.stringify({ requestId: input.requestId, keys });

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
      return {
        ok: true,
        requestId: input.requestId,
        attempts: attempt,
        keys
      } satisfies InvalidateResult;
    }

    if (attempt === maxAttempts) {
      throw new Error(`CDN invalidation failed with status ${response.status}`);
    }

    await sleep(baseDelayMs * 2 ** (attempt - 1));
  }

  throw new Error("CDN invalidation failed");
}
