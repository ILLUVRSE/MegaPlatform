import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUserFromRequest } from '@/lib/auth';
import { getDiscoverQueue } from '@/lib/services/discover';

export async function GET(req: NextRequest) {
  const user = await getOrCreateUserFromRequest(req);
  const region = req.nextUrl.searchParams.get('region') || 'US';
  const platform = req.nextUrl.searchParams.get('platform')?.trim() || undefined;
  const genre = req.nextUrl.searchParams.get('genre')?.trim() || undefined;
  const runtime = req.nextUrl.searchParams.get('runtime');
  const runtimeBucket = runtime === 'short' || runtime === 'medium' || runtime === 'long' ? runtime : undefined;
  const queue = await getDiscoverQueue(user.userId, { region, platform, genre, runtimeBucket });

  const res = NextResponse.json({ items: queue });
  res.headers.set('Cache-Control', 'private, max-age=15');
  if (user.setCookie) res.headers.set('Set-Cookie', user.setCookie);
  return res;
}
