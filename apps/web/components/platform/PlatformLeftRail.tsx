"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UnifiedSearchBox from "@/components/UnifiedSearchBox";
import { getGlobalNavItems } from "@/lib/navigation";

function RailIcon({ path }: { path: string }) {
  const commonProps = {
    className: "h-4 w-4",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true
  };

  switch (path) {
    case "/":
      return (
        <svg {...commonProps}>
          <path d="M4 11.5 12 5l8 6.5" />
          <path d="M6.5 10.5V19h11v-8.5" />
        </svg>
      );
    case "/news":
      return (
        <svg {...commonProps}>
          <rect x="4" y="5" width="16" height="14" rx="2.5" />
          <path d="M8 9h8M8 12h8M8 15h5" />
        </svg>
      );
    case "/shorts":
      return (
        <svg {...commonProps}>
          <path d="m10 7 6 3.5-6 3.5V7Z" />
          <path d="M8.5 4.5h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" />
        </svg>
      );
    case "/watch":
      return (
        <svg {...commonProps}>
          <rect x="3.5" y="5.5" width="17" height="11" rx="2.5" />
          <path d="m9.5 20 2.5-3 2.5 3" />
        </svg>
      );
    case "/games":
      return (
        <svg {...commonProps}>
          <path d="M7.5 9h9a4 4 0 0 1 3.7 5.5l-1 2.3a2.5 2.5 0 0 1-4.1.8L13.6 16a2 2 0 0 0-3.2 0l-1.5 1.6a2.5 2.5 0 0 1-4.1-.8l-1-2.3A4 4 0 0 1 7.5 9Z" />
          <path d="M8.5 12.5h3M10 11v3M15.75 12.25h.01M17.75 14.25h.01" />
        </svg>
      );
    case "/gamegrid":
      return (
        <svg {...commonProps}>
          <path d="M6 6h5v5H6zM13 6h5v5h-5zM6 13h5v5H6zM13 13h5v5h-5z" />
        </svg>
      );
    case "/pixelbrawl":
      return (
        <svg {...commonProps}>
          <path d="M8 6.5h8M9 9.5h6M10 12.5h4" />
          <path d="M8.5 18.5c0-2 1.6-3.5 3.5-3.5s3.5 1.5 3.5 3.5" />
        </svg>
      );
    case "/art-atlas":
      return (
        <svg {...commonProps}>
          <path d="M12 4.5a7.5 7.5 0 1 0 0 15c1.7 0 2.5-.9 2.5-1.9 0-1.4-1.2-1.5-1.2-2.6 0-.9.7-1.5 1.8-1.5H17a2.5 2.5 0 0 0 0-5h-5Z" />
          <path d="M8.5 10.5h.01M9.5 14h.01M13.5 9h.01" />
        </svg>
      );
    case "/party":
      return (
        <svg {...commonProps}>
          <path d="M7.5 13.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM16.5 12.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
          <path d="M4.5 18a4 4 0 0 1 6-3.4M13.5 18a3.5 3.5 0 0 1 6-2.5" />
        </svg>
      );
    case "/studio":
      return (
        <svg {...commonProps}>
          <path d="m12 4 7 4v8l-7 4-7-4V8l7-4Z" />
          <path d="m12 10 4 2.2v3.8l-4 2.2-4-2.2v-3.8L12 10Z" />
        </svg>
      );
    case "/admin":
      return (
        <svg {...commonProps}>
          <path d="M12 4.5 18 7v5c0 3.5-2.3 6.6-6 7.5-3.7-.9-6-4-6-7.5V7l6-2.5Z" />
          <path d="M12 9v4M12 16h.01" />
        </svg>
      );
    default:
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="5" />
        </svg>
      );
  }
}

function BrandMark() {
  return (
    <div
      className="platform-glow flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-[#7fffd4]/30 bg-[#7fffd4]/10 text-[#7fffd4]"
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="24" cy="24" r="3.5" fill="currentColor" stroke="none" />
        <ellipse cx="24" cy="24" rx="16" ry="7.5" />
        <ellipse cx="24" cy="24" rx="7.5" ry="16" transform="rotate(28 24 24)" />
        <ellipse cx="24" cy="24" rx="7.5" ry="16" transform="rotate(-28 24 24)" />
      </svg>
    </div>
  );
}

export default function PlatformLeftRail({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const navItems = getGlobalNavItems(isAdmin).filter((item) => item.href !== "/apps");

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="platform-sidebar-shell">
      <div className="platform-brand-lockup">
        <Link href="/" className="flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="text-[11px] uppercase tracking-[0.34em] text-[#ffe7ae]/78">ILLUVRSE</p>
            <p className="mt-1 text-lg font-semibold text-white">Creative platform</p>
          </div>
        </Link>
        <p className="mt-3 text-sm uppercase tracking-[0.28em] text-[#ffe7ae]/78">
          Entertainment operating system
        </p>
      </div>

      <UnifiedSearchBox />

      <div className="platform-identity-card">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-black text-[#0a1a1a]"
            style={{ background: "linear-gradient(135deg, #7fffd4, #49b2a2)" }}
          >
            RX
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Ryan</p>
            <p className="text-xs uppercase tracking-[0.28em] text-[#ffe7ae]/70">Creator level 12</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-white/62">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-3">
            <p className="text-lg font-semibold text-white">28</p>
            <p>Badges</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-3">
            <p className="text-lg font-semibold text-white">4</p>
            <p>Parties</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-3">
            <p className="text-lg font-semibold text-white">9</p>
            <p>Drafts</p>
          </div>
        </div>
      </div>

      <nav aria-label="Global navigation" className="space-y-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`platform-rail-link ${active ? "platform-rail-link-active" : ""}`}
            >
              <span className="platform-rail-marker">
                <RailIcon path={item.href} />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="platform-sidebar-promo">
        <p className="text-xs uppercase tracking-[0.32em] text-[#ffe7ae]/72">Tonight</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Nebula Nights premiere room</h3>
        <p className="mt-2 text-sm text-white/62">
          Watch, queue the aftershow, then spin into Party without leaving the shell.
        </p>
        <Link
          href="/party"
          className="mt-4 inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#0a1a1a]"
          style={{ background: "linear-gradient(135deg, #e2b443, #c89c2e)" }}
        >
          Join party
        </Link>
      </div>
    </div>
  );
}
