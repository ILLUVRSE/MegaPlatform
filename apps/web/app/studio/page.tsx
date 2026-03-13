/**
 * AI Studio landing page.
 * Request/response: renders creator flow and user projects.
 * Guard: none; public for MVP.
 */
import StudioCreatorFlow from "./components/StudioCreatorFlow";
import MyShorts from "./components/MyShorts";
import { summarizeJourneyContext } from "@/lib/journeyBridge";
import Link from "next/link";

export default async function StudioPage({
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
      {context ? (
        <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
          Journey context preserved: {context.label}
        </div>
      ) : null}
      <section className="platform-panel-dark">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">Studio</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Creator cockpit</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Create shorts, upload long-form video, start streams, and track what is actually moving.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/studio/short" className="interactive-focus rounded-full bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950">
              Create short
            </Link>
            <Link href="/watch/live" className="interactive-focus rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-white">
              Start stream
            </Link>
            <Link href="/studio/control-center" className="interactive-focus rounded-full border border-cyan-300/35 bg-cyan-400/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-50">
              Control center
            </Link>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {[
            ["Views", "182k"],
            ["Subs", "24.1k"],
            ["Earnings", "$12.4k"],
            ["Engagement", "8.9%"]
          ].map(([label, value]) => (
            <div key={label} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/76">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="platform-section">
        <StudioCreatorFlow />
      </section>

      <section className="platform-section">
        <MyShorts />
      </section>
    </div>
  );
}
