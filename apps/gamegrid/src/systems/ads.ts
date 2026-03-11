import { ADS_STUB_ENABLED_DEFAULT } from './constants';

declare global {
  interface Window {
    gamegridAds?: {
      requestInterstitial: (input: { reason: string; gameId: string }) => Promise<void>;
      requestRewarded: (input: { reason: string; gameId: string }) => Promise<{ rewarded: boolean }>;
    };
  }
}

export function installAdsStub(enabled = ADS_STUB_ENABLED_DEFAULT) {
  if (!enabled) return;
  window.gamegridAds = {
    requestInterstitial: async () => undefined,
    requestRewarded: async () => ({ rewarded: false })
  };
}
