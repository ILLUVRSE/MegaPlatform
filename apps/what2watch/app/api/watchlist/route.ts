import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrCreateUserFromRequest } from '@/lib/auth';
import { isRateLimited } from '@/lib/rate-limit';
import { addToWatchlist, getWatchlist, removeFromWatchlist } from '@/lib/services/watchlist';

const schema = z.object({
  action: z.enum(['add', 'remove']),
  titleId: z.string().min(1)
});

export async function GET(req: NextRequest) {
  const user = await getOrCreateUserFromRequest(req);
  const list = await getWatchlist(user.userId);
  const res = NextResponse.json({ items: list });
  if (user.setCookie) res.headers.set('Set-Cookie', user.setCookie);
  return res;
}

export async function POST(req: NextRequest) {
  const user = await getOrCreateUserFromRequest(req);
  if (isRateLimited(`watchlist:${user.anonId}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  if (body.action === 'add') {
    await addToWatchlist(user.userId, body.titleId);
  } else {
    await removeFromWatchlist(user.userId, body.titleId);
  }

  const res = NextResponse.json({ ok: true });
  if (user.setCookie) res.headers.set('Set-Cookie', user.setCookie);
  return res;
}
