export interface PaginationOptions {
  defaultLimit: number;
  maxLimit: number;
}

export interface PaginationResult {
  limit: number;
  offset: number;
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const integer = Math.trunc(parsed);
  return integer >= 0 ? integer : null;
}

export function parsePagination(
  input: { limit?: unknown; offset?: unknown },
  options: PaginationOptions
): PaginationResult {
  const parsedLimit = parsePositiveInt(input.limit);
  const parsedOffset = parsePositiveInt(input.offset);

  const limit =
    parsedLimit === null
      ? options.defaultLimit
      : Math.max(1, Math.min(options.maxLimit, parsedLimit));
  const offset = parsedOffset === null ? 0 : parsedOffset;

  return { limit, offset };
}
