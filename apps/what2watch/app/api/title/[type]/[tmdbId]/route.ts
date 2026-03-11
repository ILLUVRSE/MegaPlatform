import { NextRequest, NextResponse } from 'next/server';
import { TitleType } from '@prisma/client';
import { getTitleBundle } from '@/lib/services/title';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ type: string; tmdbId: string }> }
) {
  const { type, tmdbId } = await ctx.params;
  if (!['movie', 'tv'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  const region = req.nextUrl.searchParams.get('region') || 'US';
  const data = await getTitleBundle(type as TitleType, Number(tmdbId), region);
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const res = NextResponse.json(data);
  res.headers.set('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
  return res;
}
