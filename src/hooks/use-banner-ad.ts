import { useEffect } from 'react';
import { adController } from '@/lib/ad-controller';

/** Shows the bottom banner (Android app only) while a browse screen is open. */
export function useBannerAd() {
  useEffect(() => {
    void adController.showBanner();
    return () => { void adController.hideBanner(); };
  }, []);
}
