/**
 * Global app shell wrapper providing platform rail + content + social panel.
 * Request/response: server component fetching session for admin gating.
 * Guard: uses next-auth session and renders platform chrome for all visitors.
 */
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import UnifiedSearchBox from "@/components/UnifiedSearchBox";
import PlatformLeftRail from "@/components/platform/PlatformLeftRail";
import PlatformSocialPanel from "@/components/platform/PlatformSocialPanel";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions).catch(() => null);
  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex min-h-screen w-full max-w-[1800px] gap-4 px-3 py-3 sm:px-4 lg:gap-6 lg:px-6 lg:py-5">
        <aside className="hidden w-[280px] shrink-0 lg:block">
          <PlatformLeftRail isAdmin={isAdmin} />
        </aside>

        <div className="min-w-0 flex-1">
          <div className="platform-mobile-topbar lg:hidden">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <img src="/brand/illuvrse-logo.png" alt="ILLUVRSE" className="h-14 w-14 object-contain" />
                <div>
                  <p className="text-[11px] uppercase tracking-[0.32em] text-[#ffe7ae]/80">ILLUVRSE</p>
                  <p className="text-lg font-semibold text-white">Watch, play, create</p>
                </div>
              </div>
              <UnifiedSearchBox />
              <div className="flex flex-wrap gap-2">
                {[
                  ["/", "Home"],
                  ["/watch", "Watch"],
                  ["/shorts", "Shorts"],
                  ["/games", "Games"],
                  ["/party", "Party"],
                  ["/studio", "Studio"]
                ].map(([href, label]) => (
                  <Link key={href} href={href} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/68">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <main id="main-content" className="space-y-6 pb-10 lg:space-y-8">
            {children}
          </main>
        </div>

        <aside className="hidden w-[320px] shrink-0 xl:block">
          <PlatformSocialPanel />
        </aside>
      </div>
    </div>
  );
}
