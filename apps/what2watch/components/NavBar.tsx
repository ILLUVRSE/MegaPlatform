import Link from 'next/link';
import { NotificationsBell } from '@/components/NotificationsBell';

const links = [
  { href: '/', label: 'Live Feed' },
  { href: '/discover', label: 'Discover' },
  { href: '/watchlist', label: 'Watchlist' }
];

export function NavBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0d1b2a]/80 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-accent">
          What2Watch
        </Link>
        <div className="flex items-center gap-4 text-sm text-surf/90">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-accent">
              {link.label}
            </Link>
          ))}
          <NotificationsBell />
        </div>
      </nav>
    </header>
  );
}
