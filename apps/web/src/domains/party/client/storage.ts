const USER_KEY = "illuvrse:party:user";
const HOST_KEY_PREFIX = "illuvrse:party:host";

export function getOrCreateUserId() {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(USER_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(USER_KEY, created);
  return created;
}

export function setHostForCode(code: string, hostId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${HOST_KEY_PREFIX}:${code}`, hostId);
}

export function getHostForCode(code: string) {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(`${HOST_KEY_PREFIX}:${code}`);
}
