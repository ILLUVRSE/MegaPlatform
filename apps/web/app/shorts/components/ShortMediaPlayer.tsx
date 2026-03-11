/**
 * Short media player with HLS support.
 * Request/response: renders video/image with optional blur.
 * Guard: client component.
 */
"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";

type ShortMediaPlayerProps = {
  mediaUrl: string;
  mediaType: "VIDEO" | "IMAGE";
  blurred?: boolean;
  muted?: boolean;
  controls?: boolean;
};

export default function ShortMediaPlayer({
  mediaUrl,
  mediaType,
  blurred = false,
  muted = false,
  controls = true
}: ShortMediaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (mediaType !== "VIDEO" || !videoRef.current) return;
    if (!mediaUrl.endsWith(".m3u8")) return;

    if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      videoRef.current.src = mediaUrl;
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(mediaUrl);
      hls.attachMedia(videoRef.current);
      return () => hls.destroy();
    }
  }, [mediaType, mediaUrl]);

  const mediaClass = `w-full rounded-3xl object-cover ${blurred ? "blur-md" : ""}`;

  if (mediaType === "IMAGE") {
    return <img className={mediaClass} src={mediaUrl} alt="Short" />;
  }

  return (
    <video
      ref={videoRef}
      className={mediaClass}
      src={mediaUrl.endsWith(".m3u8") ? undefined : mediaUrl}
      controls={controls}
      muted={muted}
    />
  );
}
