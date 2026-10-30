import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

export const AD_POLICY = { enabled: true, cooldownMs: 120000, actionsBetween: 2, sessionLimit: 3 } as const;

export function canShowInterstitial(state: { enabled: boolean; loaded: boolean; busy: boolean; critical: boolean; actions: number; shown: number; elapsedMs: number }) {
  return state.enabled && state.loaded && !state.busy && !state.critical && state.actions >= AD_POLICY.actionsBetween && state.shown < AD_POLICY.sessionLimit && state.elapsedMs >= AD_POLICY.cooldownMs;
}

class AdController {
  private navigating = false;
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    if (Capacitor.isNativePlatform()) {
      try {
        await AdMob.initialize({
          initializeForTesting: true,
        });
        this.initialized = true;
      } catch (e) {
        console.warn('AdMob initialization failed:', e);
      }
    }
  }

  async showBanner() {
    if (!AD_POLICY.enabled || !Capacitor.isNativePlatform()) return;
    try {
      await this.initialize();
      await AdMob.showBanner({
        adId: 'ca-app-pub-3940256099942544/6300978111', // Test Banner ID
        adSize: BannerAdSize.BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
      });
    } catch (e) {
      console.warn('AdMob showBanner error:', e);
    }
  }

  async hideBanner() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await AdMob.hideBanner();
    } catch (e) {
      console.warn('AdMob hideBanner error:', e);
    }
  }

  async beforeApplication(navigate: () => Promise<unknown> | unknown) {
    if (this.navigating) return;
    this.navigating = true;
    try {
      if (AD_POLICY.enabled && Capacitor.isNativePlatform()) {
        try {
          await this.initialize();
          await AdMob.prepareInterstitial({
            adId: 'ca-app-pub-3940256099942544/1033173712', // Test Interstitial ID
          });
          await AdMob.showInterstitial();
        } catch (e) {
          console.warn('Interstitial ad failed or skipped:', e);
        }
      }
      await navigate();
    } finally {
      this.navigating = false;
    }
  }
}

export const adController = new AdController();

