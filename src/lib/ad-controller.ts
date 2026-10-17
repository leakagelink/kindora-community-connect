// Web/PWA has no native AdMob adapter. Production delivery intentionally stays disabled.
export const AD_POLICY = { enabled: false, cooldownMs: 120000, actionsBetween: 2, sessionLimit: 3 } as const;
export function canShowInterstitial(state: { enabled: boolean; loaded: boolean; busy: boolean; critical: boolean; actions: number; shown: number; elapsedMs: number }) {
  return state.enabled && state.loaded && !state.busy && !state.critical && state.actions >= AD_POLICY.actionsBetween && state.shown < AD_POLICY.sessionLimit && state.elapsedMs >= AD_POLICY.cooldownMs;
}
class AdController {
  private navigating = false;
  async beforeApplication(navigate: () => Promise<unknown> | unknown) {
    if (this.navigating) return;
    this.navigating = true;
    try { await navigate(); } finally { this.navigating = false; }
  }
}
export const adController = new AdController();
