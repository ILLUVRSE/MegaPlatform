import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-14 border-t border-ink/10 bg-white/80 dark:border-white/10 dark:bg-slate/80 print:hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-ink/80 dark:text-white/80 sm:px-6">
        <p>George Caleb Bingham (1811-1879) interpreted river commerce, electoral process, and regional identity in 19th-century Missouri.</p>
        <p>
          Review source citations on{' '}
          <Link href="/sources" className="text-river underline-offset-2 hover:underline">
            Sources & Rights
          </Link>
          . Images used per institution rights statements.
        </p>
      </div>
    </footer>
  );
}
