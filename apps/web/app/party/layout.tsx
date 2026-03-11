/**
 * Party area layout with shared header and shell styling.
 * Request/response: wraps party routes with consistent UI.
 * Guard: none; layout is public.
 */
import Link from "next/link";
import "./styles.css";

export default function PartyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-illuvrse-border bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">ILLUVRSE</p>
            <h1 className="text-2xl font-semibold">Party Core</h1>
            <p className="text-sm text-illuvrse-muted">
              Seat-based lobbies, synced playback, and presence.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/party"
              className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
            >
              Party Home
            </Link>
            <Link
              href="/party/create"
              className="rounded-full bg-illuvrse-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white"
            >
              Host a Party
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">{children}</main>
    </div>
  );
}
