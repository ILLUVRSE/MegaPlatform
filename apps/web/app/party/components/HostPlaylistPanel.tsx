/**
 * Host-only playlist editor panel for live updates.
 * Request/response: persists playlist via server-authenticated API.
 * Guard: client component.
 */
"use client";

import PlaylistEditor from "./PlaylistEditor";

export default function HostPlaylistPanel({ code }: { code: string }) {
  return (
    <div className="mt-6">
      <PlaylistEditor code={code} />
    </div>
  );
}
