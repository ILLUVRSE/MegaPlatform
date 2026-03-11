import Link from 'next/link';

interface ClusterCardProps {
  id: string;
  title: string;
  summaryBullets: unknown;
}

export function ClusterCard({ id, title, summaryBullets }: ClusterCardProps) {
  const bullets = Array.isArray(summaryBullets) ? summaryBullets : [];
  return (
    <article className="rounded-xl border border-slate-300 bg-white/70 p-4 shadow-sm">
      <h2 className="font-display text-xl"><Link href={`/cluster/${id}`}>{title}</Link></h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
        {bullets.slice(0, 3).map((bullet) => (
          <li key={String(bullet)}>{String(bullet)}</li>
        ))}
      </ul>
    </article>
  );
}
