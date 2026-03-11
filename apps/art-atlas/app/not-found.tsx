import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-start justify-center gap-4 px-4 py-10 sm:px-6">
      <p className="text-sm uppercase tracking-wide text-river">404</p>
      <h1 className="font-[var(--font-serif)] text-4xl font-semibold text-ink dark:text-white">Artwork not found</h1>
      <p className="text-sm text-ink/75 dark:text-white/75">The requested page is unavailable. Continue browsing through artists, gallery, or timeline.</p>
      <div className="flex gap-3">
        <Link href="/artists" className="rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold text-ink dark:border-white/20 dark:text-white">
          Artists
        </Link>
        <Link href="/gallery" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-river dark:bg-river dark:hover:bg-pine">
          Gallery
        </Link>
        <Link href="/timeline" className="rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold text-ink dark:border-white/20 dark:text-white">
          Timeline
        </Link>
      </div>
    </div>
  );
}
