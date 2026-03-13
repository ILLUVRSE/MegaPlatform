/**
 * My List toggle button.
 */
"use client";

import { useState } from "react";

export default function MyListToggleButton({ showId, initialSaved }: { showId: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);

  const toggle = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const response = await fetch("/api/watch/my-list/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaType: "SHOW", showId })
    });
    if (!response.ok) {
      if (response.status === 401) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (payload.error === "Select profile") {
          window.location.href = "/watch/profiles";
        } else {
          window.location.href = "/auth/signin?callbackUrl=/watch";
        }
      }
      return;
    }
    const payload = (await response.json()) as { saved: boolean };
    setSaved(payload.saved);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? "Remove show from My List" : "Save show to My List"}
      className="interactive-focus rounded-full bg-black/78 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white"
    >
      {saved ? "✓ Saved" : "+ List"}
    </button>
  );
}
