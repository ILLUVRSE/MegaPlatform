import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUserFromRequest } from '@/lib/auth';
import { getHomeFeed } from '@/lib/services/home';

export async function GET(req: NextRequest) {
  const user = await getOrCreateUserFromRequest(req);
  const region = req.nextUrl.searchParams.get('region') || 'US';
  const platform = req.nextUrl.searchParams.get('platform')?.trim() || undefined;
  const genre = req.nextUrl.searchParams.get('genre')?.trim() || undefined;
  const runtimeBucket = (req.nextUrl.searchParams.get('runtime') as 'short' | 'medium' | 'long' | null) || undefined;

  const feed = await getHomeFeed({
    userId: user.userId,
    region,
    platform,
    genre,
    runtimeBucket
  });

  const res = NextResponse.json(feed);
  res.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  if (user.setCookie) res.headers.set('Set-Cookie', user.setCookie);
  return res;
}
