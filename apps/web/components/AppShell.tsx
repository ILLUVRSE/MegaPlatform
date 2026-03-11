/**
 * Global app shell wrapper providing header + page container.
 * Request/response: server component fetching session for admin gating.
 * Guard: uses next-auth session; renders header for all visitors.
 */
import { getServerSession } from "next-auth";
import AppHeader from "@/components/AppHeader";
import { authOptions } from "@/lib/auth";
import { LAYOUT_CLASS } from "@/lib/ui/layout";

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
      <AppHeader isAdmin={isAdmin} />
      <main id="main-content" className={`${LAYOUT_CLASS.frame} ${LAYOUT_CLASS.stackPage} py-6 sm:py-8 lg:py-10`}>
        {children}
      </main>
    </div>
  );
}
