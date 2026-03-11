import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'w2w_anon';

export function middleware(req: NextRequest) {
  const existing = req.cookies.get(COOKIE_NAME)?.value;
  if (existing) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-w2w-anon', existing);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const anonId = globalThis.crypto.randomUUID().replace(/-/g, '');
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-w2w-anon', anonId);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.cookies.set(COOKIE_NAME, anonId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 31536000
  });
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
