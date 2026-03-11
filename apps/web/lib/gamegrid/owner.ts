const OWNER_KEY_STORAGE = "illuvrse:gamegrid-owner";

const createOwnerKey = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `gg_${Math.random().toString(36).slice(2, 12)}`;
  }
};

export const getOrCreateOwnerKey = () => {
  if (typeof window === "undefined") return null;
  const existing = window.localStorage.getItem(OWNER_KEY_STORAGE);
  if (existing && existing.length > 6) return existing;
  const next = createOwnerKey();
  window.localStorage.setItem(OWNER_KEY_STORAGE, next);
  return next;
};

export const storeOwnerKey = (value: string | null) => {
  if (typeof window === "undefined" || !value) return;
  window.localStorage.setItem(OWNER_KEY_STORAGE, value);
};
