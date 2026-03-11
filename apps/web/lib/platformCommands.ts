import type { IdentityContext } from "@/lib/identity";
import type { PlatformSessionState } from "@illuvrse/world-state";

export type PlatformCommand = {
  id: string;
  label: string;
  description: string;
  href: string;
  module: string;
  requiresAdmin?: boolean;
  requiresAuth?: boolean;
};

const BASE_COMMANDS: PlatformCommand[] = [
  { id: "home.resume", label: "Resume Session", description: "Return to the latest megaplatform context.", href: "/", module: "home" },
  { id: "watch.open", label: "Open Watch", description: "Continue lean-back viewing.", href: "/watch", module: "watch" },
  { id: "party.open", label: "Launch Party", description: "Start or join a synchronized room.", href: "/party", module: "party" },
  { id: "studio.open", label: "Open Studio", description: "Jump into creator workflows.", href: "/studio", module: "studio", requiresAuth: true },
  { id: "studio.control", label: "Creator Control Center", description: "Review progression, earnings, and tasks.", href: "/studio/control-center", module: "studio", requiresAuth: true },
  { id: "games.open", label: "Open Games", description: "Browse the games catalog.", href: "/games", module: "games" },
  { id: "news.open", label: "Open News", description: "Check editorial intelligence and headlines.", href: "/news", module: "news" },
  { id: "apps.open", label: "Open Apps Directory", description: "Browse all modules and launches.", href: "/apps", module: "apps" },
  { id: "admin.platform", label: "Platform Admin", description: "Open platform control surfaces.", href: "/admin/platform", module: "admin", requiresAdmin: true }
];

export function getPlatformCommands(input: {
  identity: Pick<IdentityContext, "userId" | "role">;
  session: Pick<PlatformSessionState, "currentModule" | "partyCode" | "trail">;
}) {
  const filtered = BASE_COMMANDS.filter((command) => {
    if (command.requiresAdmin && input.identity.role !== "admin") return false;
    if (command.requiresAuth && !input.identity.userId) return false;
    return true;
  });

  const sessionCommands: PlatformCommand[] = [];
  if (input.session.partyCode) {
    sessionCommands.push({
      id: "party.resume",
      label: "Resume Party",
      description: `Continue party ${input.session.partyCode}.`,
      href: `/party/${input.session.partyCode}`,
      module: "party"
    });
  }

  const recentCommands = input.session.trail.slice(-3).reverse().map((entry, index) => ({
    id: `recent.${index}`,
    label: `Return to ${entry.module}`,
    description: `Resume ${entry.action ?? "activity"} from ${entry.at}.`,
    href: entry.href,
    module: entry.module
  }));

  return [...sessionCommands, ...recentCommands, ...filtered];
}
