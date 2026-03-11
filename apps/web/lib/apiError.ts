import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "invalid_payload"
  | "not_found"
  | "rate_limited"
  | "conflict"
  | "internal_error";

export type ApiErrorShape = {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: string[];
  };
};

export function apiError(code: ApiErrorCode, message: string, status: number, details?: string[]) {
  return NextResponse.json<ApiErrorShape>(
    {
      ok: false,
      error: {
        code,
        message,
        ...(details && details.length > 0 ? { details } : {})
      }
    },
    { status }
  );
}

export function apiUnauthorized(message = "Unauthorized") {
  return apiError("unauthorized", message, 401);
}

export function apiForbidden(message = "Forbidden") {
  return apiError("forbidden", message, 403);
}

export function apiInvalidPayload(message = "Invalid payload", details?: string[]) {
  return apiError("invalid_payload", message, 400, details);
}

export function apiNotFound(message = "Not found") {
  return apiError("not_found", message, 404);
}

export function apiRateLimited(message = "Too many requests") {
  return apiError("rate_limited", message, 429);
}

export function apiConflict(message = "Conflict") {
  return apiError("conflict", message, 409);
}
