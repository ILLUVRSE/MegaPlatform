import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

export const ANON_COOKIE_NAME = "ILLUVRSE_ANON_ID";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const ROTATE_BEFORE_SECONDS = 60 * 60 * 24 * 30;

function getAnonSecret() {
  return process.env.ANON_COOKIE_SECRET || process.env.NEXTAUTH_SECRET || "dev-anon-secret-change-me";
}

function signPayload(payload: string) {
  return createHmac("sha256", getAnonSecret()).update(payload).digest("base64url");
}

function createSignedToken(anonId: string, expiresAtSec: number) {
  const payload = `${anonId}.${expiresAtSec}`;
  return `${payload}.${signPayload(payload)}`;
}

function parseSignedToken(token: string | undefined) {
  if (!token) return null;
  const [anonId, expiresAtRaw, signature] = token.split(".");
  if (!anonId || !expiresAtRaw || !signature) return null;

  const payload = `${anonId}.${expiresAtRaw}`;
  const expected = signPayload(payload);
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;
  return { anonId, expiresAt };
}

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, entry) => {
    const [rawKey, ...rest] = entry.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

export function getAnonIdFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  const cookies = parseCookieHeader(cookieHeader);
  const parsed = parseSignedToken(cookies[ANON_COOKIE_NAME]);
  if (!parsed || parsed.anonId.length < 6) return null;
  return parsed.anonId;
}

export function createAnonId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `anon_${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function ensureAnonId(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const cookies = parseCookieHeader(cookieHeader);
  const parsed = parseSignedToken(cookies[ANON_COOKIE_NAME]);
  if (parsed) {
    const rotateBy = Math.floor(Date.now() / 1000) + ROTATE_BEFORE_SECONDS;
    return { anonId: parsed.anonId, shouldSetCookie: parsed.expiresAt <= rotateBy };
  }
  return { anonId: createAnonId(), shouldSetCookie: true };
}

export function attachAnonCookie(response: NextResponse, anonId: string, shouldSetCookie: boolean) {
  if (!shouldSetCookie) return response;
  const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  response.cookies.set({
    name: ANON_COOKIE_NAME,
    value: createSignedToken(anonId, expiresAt),
    maxAge: MAX_AGE_SECONDS,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    path: "/"
  });
  return response;
}
