// AdMob delivery for the Android (Capacitor) app only. Website/PWA never loads ads.
// Rules: consent first, banner only on browse screens, interstitial only AFTER a
// completed submission with frequency caps. Ads never gate any feature.
export const AD_POLICY = { enabled: true, cooldownMs: 120000, actionsBetween: 2, sessionLimit: 3 } as const;

export const ADMOB_IDS = {
  appId: 'ca-app-pub-1475323931624357~9698546488',
  banner: 'ca-app-pub-1475323931624357/5979627470',
  interstitial: 'ca-app-pub-1475323931624357/4283402427',
  rewarded: 'ca-app-pub-1475323931624357/5404912408',
  rewardedInterstitial: 'ca-app-pub-1475323931624357/9152585725',
} as const;

export function canShowInterstitial(state: { enabled: boolean; loaded: boolean; busy: boolean; critical: boolean; actions: number; shown: number; elapsedMs: number }) {
  return state.enabled && state.loaded && !state.busy && !state.critical && state.actions >= AD_POLICY.actionsBetween && state.shown < AD_POLICY.sessionLimit && state.elapsedMs >= AD_POLICY.cooldownMs;
}

type AdMobModule = typeof import('@capacitor-community/admob');

function isNative() {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

class AdController {
  private navigating = false;
  private ready: Promise<AdMobModule | null> | null = null;
  private completedActions = 0;
  private shown = 0;
  private lastShownAt = -Infinity;
  private busy = false;
  private bannerVisible = false;

  private init(): Promise<AdMobModule | null> {
    if (!AD_POLICY.enabled || !isNative()) return Promise.resolve(null);
    if (!this.ready) {
      this.ready = (async () => {
        try {
          const mod = await import('@capacitor-community/admob');
          await mod.AdMob.initialize({ initializeForTesting: false });
          let consent = await mod.AdMob.requestConsentInfo();
          if (!consent.canRequestAds && consent.isConsentFormAvailable) consent = await mod.AdMob.showConsentForm();
          return consent.canRequestAds ? mod : null;
        } catch (e) {
          console.warn('Ads unavailable:', e);
          return null;
        }
      })();
    }
    return this.ready;
  }

  async showBanner() {
    const mod = await this.init();
    if (!mod || this.bannerVisible) return;
    try {
      await mod.AdMob.showBanner({ adId: ADMOB_IDS.banner, adSize: mod.BannerAdSize.ADAPTIVE_BANNER, position: mod.BannerAdPosition.BOTTOM_CENTER, margin: 0 });
      this.bannerVisible = true;
    } catch (e) { console.warn('Banner skipped:', e); }
  }

  async hideBanner() {
    if (!this.bannerVisible) return;
    const mod = await this.init();
    this.bannerVisible = false;
    try { await mod?.AdMob.removeBanner(); } catch { /* ignore */ }
  }

  /** Navigation is never delayed or blocked by ads. */
  async beforeApplication(navigate: () => Promise<unknown> | unknown) {
    if (this.navigating) return;
    this.navigating = true;
    try { await navigate(); } finally { this.navigating = false; }
  }

  /** Call only after the user's submission is saved and confirmation is shown. */
  async afterCompletedSubmission() {
    this.completedActions += 1;
    const now = Date.now();
    const eligible = canShowInterstitial({ enabled: AD_POLICY.enabled, loaded: isNative(), busy: this.busy, critical: false, actions: this.completedActions, shown: this.shown, elapsedMs: now - this.lastShownAt });
    if (!eligible) return;
    const mod = await this.init();
    if (!mod) return;
    this.busy = true;
    try {
      await mod.AdMob.prepareInterstitial({ adId: ADMOB_IDS.interstitial });
      await mod.AdMob.showInterstitial();
      this.shown += 1; this.lastShownAt = Date.now(); this.completedActions = 0;
    } catch (e) { console.warn('Interstitial skipped:', e); }
    finally { this.busy = false; }
  }
}

export const adController = new AdController();
