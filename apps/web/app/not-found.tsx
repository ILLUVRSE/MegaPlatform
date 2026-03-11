/**
 * Not found page.
 * Request/response: renders 404 message.
 * Guard: none.
 */
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="party-card space-y-3">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-sm text-illuvrse-muted">
        The destination doesn’t exist yet. Head back to the MegaPlatform homepage.
      </p>
      <Link
        href="/"
        className="rounded-full bg-illuvrse-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white"
      >
        Return home
      </Link>
    </div>
  );
}
