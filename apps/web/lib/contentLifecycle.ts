export const CONTENT_STATES = [
  "DRAFT",
  "PROCESSING",
  "REVIEW",
  "PUBLISHED",
  "REJECTED",
  "ARCHIVED"
] as const;

export type ContentState = (typeof CONTENT_STATES)[number];

export const CONTENT_ASSET_KINDS = ["VIDEO", "THUMBNAIL", "AUDIO"] as const;
export type ContentAssetKind = (typeof CONTENT_ASSET_KINDS)[number];

export type ContentLifecycleAction =
  | "request_publish"
  | "publish"
  | "reject"
  | "archive"
  | "send_to_review";

const ALLOWED_TRANSITIONS: Record<ContentState, ContentState[]> = {
  DRAFT: ["PROCESSING", "REVIEW", "ARCHIVED"],
  PROCESSING: ["REVIEW", "REJECTED", "ARCHIVED"],
  REVIEW: ["PUBLISHED", "REJECTED", "ARCHIVED"],
  PUBLISHED: ["ARCHIVED"],
  REJECTED: ["DRAFT", "ARCHIVED"],
  ARCHIVED: []
};

const VIDEO_REQUIRED_TYPES = new Set(["SHORT", "SHOW", "GAME", "PARTY_GAME", "VIDEO"]);

export function canTransition(from: ContentState, to: ContentState) {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getAllowedTransitions(from: ContentState) {
  return ALLOWED_TRANSITIONS[from] ?? [];
}

export function resolveRequestPublishState(contentType: string, hasVideoAsset: boolean): ContentState {
  const normalized = contentType.trim().toUpperCase();
  if (VIDEO_REQUIRED_TYPES.has(normalized) && !hasVideoAsset) {
    return "PROCESSING";
  }
  return "REVIEW";
}

export function assertValidTransition(from: ContentState, to: ContentState) {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid content state transition: ${from} -> ${to}`);
  }
}

export function toContentState(value: string): ContentState {
  if (!CONTENT_STATES.includes(value as ContentState)) {
    throw new Error(`Invalid content state: ${value}`);
  }
  return value as ContentState;
}
