type HeaderSource = Pick<Headers, "get"> | null | undefined;

const REGION_HEADER_NAMES = [
  "x-vercel-ip-country",
  "cloudfront-viewer-country",
  "cf-ipcountry",
  "x-geo-country",
  "x-illuvrse-region"
] as const;

export function resolveWatchRequestRegion(headers: HeaderSource) {
  for (const headerName of REGION_HEADER_NAMES) {
    const value = headers?.get(headerName)?.trim().toUpperCase();
    if (value && value.length >= 2) {
      return value;
    }
  }

  return null;
}
