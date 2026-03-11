'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/cn';

const links = [
  { href: '/', label: 'Home' },
  { href: '/artists', label: 'Artists' },
  { href: '/collection', label: 'My Collection' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/timeline', label: 'Timeline' },
  { href: '/sources', label: 'Sources & Rights' }
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-slate/95">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="font-[var(--font-serif)] text-2xl font-semibold text-ink dark:text-white">
          Art Atlas
        </Link>
        <div className="flex items-center gap-2">
          <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-river',
                    active
                      ? 'bg-river text-white'
                      : 'text-ink hover:bg-ink/5 dark:text-white dark:hover:bg-white/10'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
