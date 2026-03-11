import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import { ANON_COOKIE_NAME, attachAnonCookie, ensureAnonId } from "@/lib/anon";

describe("anon cookie helpers", () => {
  it("sets signed httpOnly cookie", () => {
    const response = NextResponse.json({ ok: true });
    attachAnonCookie(response, "anon-12345", true);
    const cookie = response.cookies.get(ANON_COOKIE_NAME);
    expect(cookie).toBeDefined();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.value.split(".").length).toBe(3);
  });

  it("reuses existing signed cookie when valid", () => {
    const response = NextResponse.json({ ok: true });
    attachAnonCookie(response, "anon-abcde", true);
    const cookie = response.cookies.get(ANON_COOKIE_NAME);
    const req = new Request("http://localhost", {
      headers: { cookie: `${ANON_COOKIE_NAME}=${cookie?.value}` }
    });
    const result = ensureAnonId(req);
    expect(result.anonId).toBe("anon-abcde");
    expect(result.shouldSetCookie).toBe(false);
  });
});

