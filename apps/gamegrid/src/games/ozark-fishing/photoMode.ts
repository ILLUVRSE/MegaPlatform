export type PhotoFilter = 'none' | 'warm_sunset' | 'cool_morning' | 'high_contrast' | 'black_white';

export interface PhotoOverlayInfo {
  species: string;
  weightLabel: string;
  rarity: string;
  spot: string;
  weather: string;
  dateLabel: string;
}

export interface PhotoModeState {
  active: boolean;
  zoom: number;
  panX: number;
  panY: number;
  uiVisible: boolean;
  filter: PhotoFilter;
  infoOverlayVisible: boolean;
}

export function createDefaultPhotoModeState(): PhotoModeState {
  return {
    active: false,
    zoom: 1,
    panX: 0,
    panY: 0,
    uiVisible: true,
    filter: 'none',
    infoOverlayVisible: true
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function adjustPhotoCamera(state: PhotoModeState, zoomDelta: number, panXDelta: number, panYDelta: number): PhotoModeState {
  return {
    ...state,
    zoom: clamp(state.zoom + zoomDelta, 0.85, 1.4),
    panX: clamp(state.panX + panXDelta, -120, 120),
    panY: clamp(state.panY + panYDelta, -120, 120)
  };
}

export function cyclePhotoFilter(current: PhotoFilter): PhotoFilter {
  const order: PhotoFilter[] = ['none', 'warm_sunset', 'cool_morning', 'high_contrast', 'black_white'];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

export function applyPhotoFilterRgba(data: Uint8ClampedArray, filter: PhotoFilter): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  out.set(data);

  for (let i = 0; i < out.length; i += 4) {
    let r = out[i];
    let g = out[i + 1];
    let b = out[i + 2];

    if (filter === 'warm_sunset') {
      r = clamp(r * 1.1 + 12, 0, 255);
      g = clamp(g * 1.02 + 4, 0, 255);
      b = clamp(b * 0.9, 0, 255);
    } else if (filter === 'cool_morning') {
      r = clamp(r * 0.92, 0, 255);
      g = clamp(g * 1.01, 0, 255);
      b = clamp(b * 1.12 + 6, 0, 255);
    } else if (filter === 'high_contrast') {
      r = clamp((r - 128) * 1.25 + 128, 0, 255);
      g = clamp((g - 128) * 1.25 + 128, 0, 255);
      b = clamp((b - 128) * 1.25 + 128, 0, 255);
    } else if (filter === 'black_white') {
      const y = clamp(Math.round(0.299 * r + 0.587 * g + 0.114 * b), 0, 255);
      r = y;
      g = y;
      b = y;
    }

    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
  }

  return out;
}

const PNG_MAGIC = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

function makePseudoPngBytes(metadata: string): Uint8Array {
  const meta = new TextEncoder().encode(metadata);
  const bytes = new Uint8Array(PNG_MAGIC.length + meta.length);
  bytes.set(PNG_MAGIC, 0);
  bytes.set(meta, PNG_MAGIC.length);
  return bytes;
}

export async function exportPhotoModePng(options: {
  width: number;
  height: number;
  filter: PhotoFilter;
  backgroundPack?: string;
  uiHidden?: boolean;
  overlayInfo?: PhotoOverlayInfo;
  title?: string;
}): Promise<Blob> {
  const metadata = [
    `w=${options.width}`,
    `h=${options.height}`,
    `filter=${options.filter}`,
    `bg=${options.backgroundPack ?? 'default'}`,
    `ui=${options.uiHidden === true ? 'hidden' : 'visible'}`,
    `title=${options.title ?? 'Ozark Fishing Photo'}`,
    options.overlayInfo ? `species=${options.overlayInfo.species}` : ''
  ]
    .filter(Boolean)
    .join('|');

  const bytes = makePseudoPngBytes(metadata);
  const buffer = bytes.slice().buffer as ArrayBuffer;
  return new Blob([buffer], { type: 'image/png' });
}

export function isPngBlobLike(blob: Blob): Promise<boolean> {
  const readBuffer = typeof blob.arrayBuffer === 'function'
    ? blob.arrayBuffer()
    : new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      });

  return readBuffer.then((buffer) => {
    const bytes = new Uint8Array(buffer.slice(0, 8));
    if (bytes.length < 8) return false;
    for (let i = 0; i < PNG_MAGIC.length; i += 1) {
      if (bytes[i] !== PNG_MAGIC[i]) return false;
    }
    return true;
  });
}
