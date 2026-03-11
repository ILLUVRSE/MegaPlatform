/**
 * Party landing page describing the feature and entry points.
 * Request/response: renders marketing and navigation links.
 * Guard: none; public view.
 */
import Link from "next/link";
import JoinPartyForm from "./components/JoinPartyForm";
import { buildPartyToStudioHref, summarizeJourneyContext } from "@/lib/journeyBridge";

export default async function PartyLandingPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const context = summarizeJourneyContext({
    source: typeof params.source === "string" ? params.source : undefined,
    show: typeof params.show === "string" ? params.show : undefined,
    episodeId: typeof params.episodeId === "string" ? params.episodeId : undefined,
    partyCode: typeof params.partyCode === "string" ? params.partyCode : undefined
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="party-card space-y-4">
        {context ? (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-illuvrse-muted">{context.label}</p>
        ) : null}
        <h2 className="text-3xl font-semibold">Launch a synchronized watch party in seconds.</h2>
        <p className="text-illuvrse-muted">
          Party Core lets hosts spin up seat-based lobbies with real-time presence and
          shared playback control. Invite friends, lock seats, and keep playback in sync
          while LiveKit support is wired in.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/party/create"
            className="rounded-full bg-illuvrse-primary px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white"
          >
            Create Party
          </Link>
          <Link
            href="/party/minigames"
            className="rounded-full border border-illuvrse-border px-5 py-2 text-xs font-semibold uppercase tracking-widest"
          >
            Party Minigames
          </Link>
          <Link
            href={buildPartyToStudioHref(typeof params.partyCode === "string" ? params.partyCode : undefined)}
            className="rounded-full border border-amber-300/60 bg-amber-100 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-amber-900"
          >
            Continue in Studio
          </Link>
          <JoinPartyForm />
        </div>
      </section>
      <section className="party-card space-y-4">
        <h3 className="text-lg font-semibold">What is included</h3>
        <ul className="space-y-3 text-sm text-illuvrse-muted">
          <li>Seat grid with reservation TTL, lock states, and visual presence.</li>
          <li>Leader-based playback sync with drift correction every 2 seconds.</li>
          <li>Redis-backed world-state and SSE updates for seat & playback changes.</li>
          <li>LiveKit-ready UI controls with stubbed hooks for future wiring.</li>
        </ul>
      </section>
    </div>
  );
}
