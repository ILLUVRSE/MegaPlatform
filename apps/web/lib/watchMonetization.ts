export const WATCH_MONETIZATION_MODES = ["FREE", "PREMIUM", "TICKETED"] as const;

export type WatchMonetizationMode = (typeof WATCH_MONETIZATION_MODES)[number];

export type WatchMonetizationRecord = {
  monetizationMode?: WatchMonetizationMode | null;
  priceCents?: number | null;
  currency?: string | null;
  adsEnabled?: boolean | null;
  isPremium?: boolean | null;
  price?: number | null;
};

type LooseWatchMonetizationSource = {
  monetizationMode?: unknown;
  priceCents?: unknown;
  currency?: unknown;
  adsEnabled?: unknown;
  isPremium?: unknown;
  price?: unknown;
};

export function readWatchMonetization(value: unknown): WatchMonetizationRecord {
  const record = (value ?? {}) as LooseWatchMonetizationSource;
  const monetizationMode =
    record.monetizationMode === "FREE" || record.monetizationMode === "PREMIUM" || record.monetizationMode === "TICKETED"
      ? record.monetizationMode
      : undefined;

  return {
    monetizationMode,
    priceCents: typeof record.priceCents === "number" ? record.priceCents : null,
    currency: typeof record.currency === "string" ? record.currency : null,
    adsEnabled: typeof record.adsEnabled === "boolean" ? record.adsEnabled : false,
    isPremium: typeof record.isPremium === "boolean" ? record.isPremium : null,
    price: typeof record.price === "number" ? record.price : null
  };
}

export function resolveWatchMonetization(
  parent?: WatchMonetizationRecord | null,
  child?: WatchMonetizationRecord | null
): {
  monetizationMode: WatchMonetizationMode;
  priceCents: number | null;
  currency: string | null;
  adsEnabled: boolean;
} {
  const parentMode = parent?.monetizationMode ?? (parent?.isPremium ? "PREMIUM" : "FREE");
  const childMode = child?.monetizationMode ?? (child?.isPremium ? "PREMIUM" : "FREE");
  const childOverrides = childMode !== "FREE";
  const monetizationMode = childOverrides ? childMode : parentMode;
  const rawPriceCents = childOverrides
    ? (child?.priceCents ?? child?.price ?? null)
    : (parent?.priceCents ?? parent?.price ?? null);
  const rawCurrency = childOverrides ? (child?.currency ?? null) : (parent?.currency ?? null);

  return {
    monetizationMode,
    priceCents: rawPriceCents,
    currency: rawCurrency ?? (rawPriceCents != null ? "USD" : null),
    adsEnabled: Boolean(parent?.adsEnabled || child?.adsEnabled)
  };
}

export function isLockedWatchMonetization(mode: WatchMonetizationMode | null | undefined) {
  return mode === "PREMIUM" || mode === "TICKETED";
}

export function formatWatchPrice(priceCents: number | null | undefined, currency: string | null | undefined) {
  if (priceCents == null || !currency) {
    return null;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(priceCents / 100);
  } catch {
    return `${currency.toUpperCase()} ${(priceCents / 100).toFixed(2)}`;
  }
}

export function getWatchMonetizationLabel(input: WatchMonetizationRecord) {
  if (input.monetizationMode === "TICKETED") {
    return "Ticketed";
  }
  if (input.monetizationMode === "PREMIUM") {
    return "Premium";
  }
  return input.adsEnabled ? "Ad-supported" : "Free";
}
