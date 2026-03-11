interface AssetLoadSample {
  label: string;
  durationMs: number;
  timestamp: number;
  ok: boolean;
}

const MAX_SAMPLES = 80;
const samples: AssetLoadSample[] = [];

function pushSample(sample: AssetLoadSample) {
  samples.push(sample);
  if (samples.length > MAX_SAMPLES) samples.shift();
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info(`[perf] ${sample.label} ${sample.ok ? 'ok' : 'fail'} ${Math.round(sample.durationMs)}ms`);
  }
}

export function getPerfSamples() {
  return samples.slice();
}

export async function trackAssetLoad<T>(label: string, loader: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    const result = await loader();
    pushSample({ label, durationMs: performance.now() - start, timestamp: Date.now(), ok: true });
    return result;
  } catch (error) {
    pushSample({ label, durationMs: performance.now() - start, timestamp: Date.now(), ok: false });
    throw error;
  }
}

export function createFpsSampler(onSample: (fps: number) => void, intervalMs = 500) {
  let raf = 0;
  let last = performance.now();
  let frames = 0;
  let acc = 0;
  const tick = (now: number) => {
    frames += 1;
    acc += now - last;
    last = now;
    if (acc >= intervalMs) {
      onSample(Math.round((frames * 1000) / acc));
      frames = 0;
      acc = 0;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
