import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { runAllJobs } from '@/lib/jobs/run';
import { isRateLimited } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  if (isRateLimited('admin-run-jobs', 6, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  const secret = req.headers.get('x-job-secret') || req.nextUrl.searchParams.get('secret');
  if (!secret || secret !== config.jobSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runAllJobs();
  return NextResponse.json({ ok: true, result });
}
