/**
 * Paywall UI stub for premium shorts.
 * Request/response: renders blurred preview and unlock action.
 * Guard: client component.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ShortMediaPlayer from "./ShortMediaPlayer";

type ShortPaywallProps = {
  shortId: string;
  mediaUrl: string;
  mediaType: "VIDEO" | "IMAGE";
  price: number | null;
};

export default function ShortPaywall({ shortId, mediaUrl, mediaType, price }: ShortPaywallProps) {
  const router = useRouter();
  const [unlocking, setUnlocking] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!previewing) return;
    const timer = setTimeout(() => setPreviewing(false), 3000);
    return () => clearTimeout(timer);
  }, [previewing]);

  const formattedPrice = price != null ? `$${(price / 100).toFixed(2)}` : "$0.00";

  const handleUnlock = async () => {
    setUnlocking(true);
    setError(null);
    const response = await fetch(`/api/shorts/${shortId}/purchase`, { method: "POST" });
    if (!response.ok) {
      setError("Unable to unlock right now.");
      setUnlocking(false);
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl">
        <ShortMediaPlayer
          mediaUrl={mediaUrl}
          mediaType={mediaType}
          blurred={!previewing}
          controls={false}
          muted
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 text-center text-white">
          <p className="text-xs uppercase tracking-[0.3em]">Premium Short</p>
          <h2 className="text-2xl font-semibold">Unlock for {formattedPrice}</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black"
              onClick={handleUnlock}
              disabled={unlocking}
            >
              {unlocking ? "Unlocking" : "Unlock"}
            </button>
            <button
              type="button"
              className="rounded-full border border-white/60 px-5 py-2 text-xs font-semibold uppercase tracking-widest"
              onClick={() => setPreviewing(true)}
              disabled={previewing}
            >
              {previewing ? "Previewing" : "Preview"}
            </button>
          </div>
          {error ? <p className="text-xs text-illuvrse-danger">{error}</p> : null}
        </div>
      </div>
      <p className="text-sm text-illuvrse-muted">Purchase grants access for this device/account.</p>
    </div>
  );
}
