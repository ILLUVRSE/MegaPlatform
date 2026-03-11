/**
 * Shared video player with HLS support.
 * Guard: client component.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

export function isHlsSource(url: string) {
  return url.toLowerCase().includes(".m3u8");
}

type VideoPlayerProps = {
  src: string;
  poster?: string | null;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  initialTimeSec?: number;
  onProgress?: (payload: { currentTime: number; duration: number }) => void;
};

export default function VideoPlayer({
  src,
  poster,
  autoPlay = false,
  muted = false,
  controls = true,
  initialTimeSec,
  onProgress
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isHlsSource(src)) {
      video.src = src;
      return;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, () => {
        setError("Stream unavailable.");
      });
      return () => hls.destroy();
    }
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || initialTimeSec == null || initialTimeSec <= 0) return;
    const handleLoaded = () => {
      try {
        video.currentTime = initialTimeSec;
      } catch {
        // ignore seek errors
      }
    };
    video.addEventListener("loadedmetadata", handleLoaded);
    return () => {
      video.removeEventListener("loadedmetadata", handleLoaded);
    };
  }, [initialTimeSec]);

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className="w-full rounded-3xl bg-black"
        controls={controls}
        muted={muted}
        autoPlay={autoPlay}
        poster={poster ?? undefined}
        onError={() => setError("Stream unavailable.")}
        onTimeUpdate={(event) => {
          if (!onProgress) return;
          const target = event.currentTarget;
          onProgress({ currentTime: target.currentTime, duration: target.duration });
        }}
      />
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl bg-black/70 text-white">
          <p className="text-sm font-semibold">{error}</p>
          <button
            type="button"
            className="rounded-full border border-white/50 px-4 py-2 text-xs font-semibold uppercase tracking-widest"
            onClick={() => {
              setError(null);
              if (videoRef.current) {
                videoRef.current.load();
              }
            }}
          >
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}
