/**
 * Upload allowlist and sizing rules shared across API and client.
 */
export const UPLOAD_KINDS = ["IMAGE_UPLOAD", "AUDIO_UPLOAD", "VIDEO_UPLOAD"] as const;

export type UploadKind = (typeof UPLOAD_KINDS)[number];

export const ALLOWED_CONTENT_TYPES: Record<UploadKind, string[]> = {
  IMAGE_UPLOAD: ["image/png", "image/jpeg", "image/webp"],
  VIDEO_UPLOAD: ["video/mp4"],
  AUDIO_UPLOAD: ["audio/mpeg", "audio/wav"]
};

export const MAX_UPLOAD_BYTES: Record<UploadKind, number> = {
  IMAGE_UPLOAD: 10 * 1024 * 1024,
  VIDEO_UPLOAD: 250 * 1024 * 1024,
  AUDIO_UPLOAD: 50 * 1024 * 1024
};

export function getAcceptForKind(kind: UploadKind) {
  return ALLOWED_CONTENT_TYPES[kind].join(",");
}

export function validateUploadPayload(payload: {
  kind: UploadKind;
  contentType: string;
  contentLength: number;
}) {
  const allowed = ALLOWED_CONTENT_TYPES[payload.kind];
  if (!allowed.includes(payload.contentType)) {
    return `Unsupported content type for ${payload.kind}.`;
  }
  const max = MAX_UPLOAD_BYTES[payload.kind];
  if (payload.contentLength > max) {
    return `File exceeds max size for ${payload.kind}.`;
  }
  return null;
}
