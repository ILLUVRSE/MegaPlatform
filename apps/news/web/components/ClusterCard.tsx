import Link from 'next/link';

interface ClusterCardProps {
  id: string;
  title: string;
  summaryBullets: unknown;
  variant?: 'default' | 'embed';
}

export function ClusterCard({ id, title, summaryBullets, variant = 'default' }: ClusterCardProps) {
  const bullets = Array.isArray(summaryBullets) ? summaryBullets : [];
  const href = variant === 'embed' ? `/cluster/${id}?embed=illuvrse` : `/cluster/${id}`;

  if (variant === 'embed') {
    return (
      <article className="group w-[320px] shrink-0 overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,24,33,0.98),rgba(7,10,20,0.98))] text-white shadow-[0_10px_40px_rgba(0,0,0,0.45)] transition hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(73,178,162,0.25)]">
        <Link href={href} className="block">
          <div className="aspect-video bg-[radial-gradient(circle_at_top_left,rgba(127,255,212,0.28),rgba(17,24,39,0.92)_60%)] p-5">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.26em] text-[#c9fff1]">
              <span>Trending</span>
              <span>New</span>
            </div>
            <p className="mt-10 max-w-[12rem] text-lg font-semibold leading-tight">{title}</p>
          </div>
          <div className="space-y-3 p-5">
            <p className="text-sm text-white/72">{String(bullets[0] ?? 'Cross-source coverage with platform context and editorial framing.')}</p>
            <ul className="space-y-2 text-sm text-white/62">
              {bullets.slice(1, 3).map((bullet) => (
                <li key={String(bullet)}>{String(bullet)}</li>
              ))}
            </ul>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-slate-300 bg-white/70 p-4 shadow-sm">
      <h2 className="font-display text-xl"><Link href={href}>{title}</Link></h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
        {bullets.slice(0, 3).map((bullet) => (
          <li key={String(bullet)}>{String(bullet)}</li>
        ))}
      </ul>
    </article>
  );
}
