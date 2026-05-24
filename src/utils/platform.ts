export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator;
  const ua = nav.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return nav.platform === 'MacIntel' && (nav as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1;
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(display-mode: standalone)').matches;
}

export function isIOSStandalone(): boolean {
  return isIOS() && isStandalonePWA();
}
