"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/shows", label: "Shows" },
  { href: "/admin/seasons", label: "Seasons" },
  { href: "/admin/episodes", label: "Episodes" },
  { href: "/admin/live", label: "Live TV" },
  { href: "/admin/assets", label: "Assets" },
  { href: "/admin/profiles", label: "Profiles" },
  { href: "/admin/monetization", label: "Monetization" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/roles", label: "Roles" },
  { href: "/admin/feed/posts", label: "Home Feed" },
  { href: "/admin/feed/reports", label: "Feed Reports" },
  { href: "/admin/feed/settings", label: "Feed Settings" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/platform", label: "Platform" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/media-corp", label: "Media Corp Sandbox" },
  { href: "/admin/ops", label: "Ops" }
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "rounded-xl px-4 py-3 text-sm font-semibold transition",
              active
                ? "bg-illuvrse-primary text-white shadow"
                : "bg-white text-illuvrse-text border border-illuvrse-border hover:border-illuvrse-primary"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
