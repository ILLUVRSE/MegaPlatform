export const PROFILE_COOKIE = "ILLUVRSE_PROFILE_ID";

export function getProfileIdFromCookie(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  const segment = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${PROFILE_COOKIE}=`));

  if (!segment) return null;
  const rawValue = segment.slice(`${PROFILE_COOKIE}=`.length);
  if (!rawValue) return null;

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}
