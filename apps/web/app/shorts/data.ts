/**
 * Stub short feed data for the MegaPlatform.
 * Request/response: exports in-memory short cards for UI.
 * Guard: none; placeholder data.
 */
export type ShortItem = {
  id: string;
  title: string;
  creator: string;
  thumb: string;
  durationSec: number;
};

export const SHORTS: ShortItem[] = [
  {
    id: "short-1",
    title: "Nebula Nights: Teaser Cut",
    creator: "ILLUVRSE Studio",
    thumb: "https://placehold.co/360x640?text=Short+1",
    durationSec: 32
  },
  {
    id: "short-2",
    title: "Episode 1 Recap",
    creator: "ILLUVRSE Fan",
    thumb: "https://placehold.co/360x640?text=Short+2",
    durationSec: 45
  },
  {
    id: "short-3",
    title: "Behind the Scenes",
    creator: "ILLUVRSE Studio",
    thumb: "https://placehold.co/360x640?text=Short+3",
    durationSec: 27
  }
];
