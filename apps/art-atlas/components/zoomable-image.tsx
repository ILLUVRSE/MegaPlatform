'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ZoomableImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export function ZoomableImage({ src, alt, width, height }: ZoomableImageProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [lastPointer, setLastPointer] = useState<{ x: number; y: number } | null>(null);

  const clamp = (value: number, max: number) => Math.min(max, Math.max(-max, value));

  const setZoomSafe = (next: number) => {
    const capped = Math.min(4, Math.max(1, next));
    setZoom(capped);
    if (capped === 1) {
      setOffset({ x: 0, y: 0 });
    }
  };

  return (
    <Card className="space-y-3 p-3">
      <div
        ref={frameRef}
        className="relative aspect-[4/3] w-full touch-none overflow-hidden rounded-xl bg-ink/5 dark:bg-white/5"
        onDoubleClick={() => setZoomSafe(zoom > 1 ? 1 : 2)}
        onWheel={(event) => {
          event.preventDefault();
          setZoomSafe(zoom + (event.deltaY < 0 ? 0.2 : -0.2));
        }}
        onPointerDown={(event) => {
          if (zoom <= 1) {
            return;
          }
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
          setLastPointer({ x: event.clientX, y: event.clientY });
        }}
        onPointerMove={(event) => {
          if (!dragging || !lastPointer || zoom <= 1) {
            return;
          }
          const dx = event.clientX - lastPointer.x;
          const dy = event.clientY - lastPointer.y;
          setOffset((previous) => ({
            x: clamp(previous.x + dx, 180),
            y: clamp(previous.y + dy, 180)
          }));
          setLastPointer({ x: event.clientX, y: event.clientY });
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId);
          setDragging(false);
          setLastPointer(null);
        }}
        aria-label="Zoomable artwork image"
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="h-full w-full object-contain transition-transform duration-150"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
          sizes="(max-width: 1024px) 100vw, 60vw"
          priority
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={() => setZoomSafe(zoom + 0.2)} aria-label="Zoom in">
          Zoom in
        </Button>
        <Button type="button" variant="secondary" onClick={() => setZoomSafe(zoom - 0.2)} aria-label="Zoom out">
          Zoom out
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setZoomSafe(1);
            setOffset({ x: 0, y: 0 });
          }}
          aria-label="Reset view"
        >
          Reset view
        </Button>
        <p className="ml-auto text-xs text-ink/70 dark:text-white/70">Zoom: {zoom.toFixed(1)}x (wheel, drag, or double-click)</p>
      </div>
    </Card>
  );
}
