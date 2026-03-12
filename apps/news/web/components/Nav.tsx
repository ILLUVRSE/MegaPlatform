'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const links = [
  ['Home', '/'],
  ['Vertical', '/vertical'],
  ['Local', '/local'],
  ['Search', '/search'],
  ['My Briefing', '/my-briefing'],
  ['Podcasts', '/podcast/daily_vertical'],
  ['Forge', '/admin'],
  ['Tasks', '/admin/tasks']
] as const;

export function Nav() {
  const searchParams = useSearchParams();
  if (searchParams.get('embed') === 'illuvrse') {
    return null;
  }

  return (
    <nav className="mb-8 flex flex-wrap gap-3 text-sm font-semibold">
      {links.map(([label, href]) => (
        <Link key={href} href={href} className="rounded-full bg-ink px-3 py-1 text-white">
          {label}
        </Link>
      ))}
    </nav>
  );
}
