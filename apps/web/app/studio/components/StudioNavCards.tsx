/**
 * Studio navigation cards.
 * Request/response: renders links to studio tools.
 * Guard: none.
 */
import Link from "next/link";

export default function StudioNavCards() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <Link href="/studio/show-projects" className="party-card space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Show Projects</p>
        <h3 className="text-xl font-semibold">Manage series and movies</h3>
        <p className="text-sm text-illuvrse-muted">Create, track, and open long-form projects.</p>
      </Link>
      <Link href="/studio/short" className="party-card space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Short Generator</p>
        <h3 className="text-xl font-semibold">Generate a short-form video</h3>
        <p className="text-sm text-illuvrse-muted">Script → scenes → render → publish.</p>
      </Link>
      <Link href="/studio/meme" className="party-card space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">MemeMachine</p>
        <h3 className="text-xl font-semibold">Turn moments into memes</h3>
        <p className="text-sm text-illuvrse-muted">Upload or pick a frame, caption, render.</p>
      </Link>
      <Link href="/studio/ops" className="party-card space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Studio Ops</p>
        <h3 className="text-xl font-semibold">Triage failures and retries</h3>
        <p className="text-sm text-illuvrse-muted">Inspect errors, inputs, and outputs.</p>
      </Link>
      <Link href="/studio/content" className="party-card space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Content Lifecycle</p>
        <h3 className="text-xl font-semibold">Manage publish state</h3>
        <p className="text-sm text-illuvrse-muted">Edit metadata and run draft/review/publish flow.</p>
      </Link>
    </div>
  );
}
