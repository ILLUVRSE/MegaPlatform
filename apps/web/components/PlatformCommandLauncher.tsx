"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Command = {
  id: string;
  label: string;
  description: string;
  href: string;
  module: string;
};

export default function PlatformCommandLauncher() {
  const [open, setOpen] = useState(false);
  const [commands, setCommands] = useState<Command[]>([]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    void fetch("/api/platform/commands")
      .then((response) => response.json())
      .then((payload: { commands?: Command[] }) => setCommands(payload.commands ?? []))
      .catch(() => setCommands([]));
  }, [open]);

  return (
    <div data-testid="platform-command-launcher">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-full border border-illuvrse-border bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
      >
        Command
      </button>
      {open ? (
        <div className="absolute right-6 top-20 z-30 w-[340px] rounded-3xl border border-illuvrse-border bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-illuvrse-muted">Megaplatform actions</p>
          <div className="mt-3 space-y-2">
            {commands.slice(0, 8).map((command) => (
              <Link
                key={command.id}
                href={command.href}
                onClick={() => setOpen(false)}
                className="block rounded-2xl border border-illuvrse-border px-3 py-2 hover:bg-illuvrse-primary/5"
              >
                <p className="text-sm font-semibold text-illuvrse-text">{command.label}</p>
                <p className="text-sm text-illuvrse-muted">{command.description}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
