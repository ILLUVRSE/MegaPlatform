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
        <div className="rounded-2xl border border-illuvrse-border bg-illuvrse-bg px-4 py-3 text-sm text-illuvrse-muted">
          Journey context preserved: {context.label}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Link href="/studio/control-center" className="party-button inline-flex w-fit">
          Open Creator Control Center
        </Link>
      </div>
      <StudioCreatorFlow />
      <MyShorts />
    </div>
  );
}
