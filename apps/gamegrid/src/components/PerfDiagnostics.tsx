import { useEffect, useState } from 'react';

interface PerfDiagnosticsProps {
  enabled: boolean;
}

function readConnection() {
  const info = navigator as Navigator & { connection?: { effectiveType?: string; rtt?: number; downlink?: number } };
  const connection = info.connection;
  return {
    effectiveType: connection?.effectiveType ?? 'unknown',
    rtt: connection?.rtt ?? 0,
    downlink: connection?.downlink ?? 0
  };
}

export function PerfDiagnostics({ enabled }: PerfDiagnosticsProps) {
  const [fps, setFps] = useState(0);
  const [net, setNet] = useState(readConnection);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let last = performance.now();
    let frames = 0;
    let acc = 0;
    const tick = (now: number) => {
      frames += 1;
      acc += now - last;
      last = now;
      if (acc >= 500) {
        setFps(Math.round((frames * 1000) / acc));
        frames = 0;
        acc = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const timer = window.setInterval(() => setNet(readConnection()), 2000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <aside className="perf-diagnostics" aria-live="polite">
      <strong>Perf</strong>
      <span>FPS: {fps}</span>
      <span>Net: {net.effectiveType}</span>
      <span>RTT: {net.rtt}ms</span>
      <span>Down: {net.downlink}Mbps</span>
    </aside>
  );
}

