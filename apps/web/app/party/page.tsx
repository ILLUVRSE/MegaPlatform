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
    <div className="space-y-6">
      <section className="platform-panel-dark">
        {context ? (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/62">{context.label}</p>
        ) : null}
        <div className="mt-2 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold text-white">Enter the room, not a workflow.</h1>
            <p className="max-w-2xl text-sm text-white/80">
              Party is the social layer of ILLUVRSE: shared playback, seats, live chat, and quick pivots into minigames or studio remixes.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/party/create" className="interactive-focus rounded-full bg-white px-5 py-3 text-xs font-semibold uppercase tracking-widest text-slate-950">
                Create party
              </Link>
              <Link href="/party/minigames" className="interactive-focus rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-white">
                Party minigames
              </Link>
              <Link
                href={buildPartyToStudioHref(typeof params.partyCode === "string" ? params.partyCode : undefined)}
                className="interactive-focus rounded-full border border-amber-300/40 bg-amber-300/10 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-amber-50"
              >
                Continue in studio
              </Link>
              <JoinPartyForm />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">Room preview</p>
            <div className="mt-4 rounded-[24px] border border-white/10 bg-black/40 p-4">
              <p className="text-sm font-semibold text-white">Nebula Nights</p>
              <div className="mt-4 h-44 rounded-[20px] bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(15,23,42,0.34),rgba(217,70,239,0.16))]" />
              <div className="mt-4 flex gap-3">
                {["Ryan", "Alex", "Jamie", "Seat"].map((seat) => (
                  <div key={seat} className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-center text-xs font-semibold uppercase tracking-[0.24em] text-white/68">
                    {seat}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="platform-section">
          <p className="text-xs uppercase tracking-[0.3em] text-white/78">Social layout</p>
          <div className="grid gap-4 lg:grid-cols-[1fr_0.72fr]">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <h2 className="text-xl font-semibold text-white">Chat</h2>
              <div className="mt-4 space-y-3 text-sm text-white/84">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">Ryan: this is crazy</div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">Alex: queue the next one</div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">Jamie: clip this for shorts</div>
              </div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <h2 className="text-xl font-semibold text-white">Participants</h2>
              <div className="mt-4 space-y-3">
                {["Ryan", "Alex", "Jamie", "Open Seat"].map((name) => (
                  <div key={name} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/84">
                    {name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="platform-section">
          <h2 className="text-xl font-semibold text-white">What is included</h2>
          <ul className="space-y-3 text-sm text-white/82">
            <li>Seat grid with reservation TTL, lock states, and visual presence.</li>
            <li>Leader-based playback sync with drift correction every 2 seconds.</li>
            <li>Redis-backed world-state and SSE updates for seat and playback changes.</li>
            <li>Voice, chat, invites, and playlist hooks wired for room-based behavior.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
