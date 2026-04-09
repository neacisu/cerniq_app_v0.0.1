import type { CookieConsent } from "@/lib/cookie-consent-storage.js";
import { readCookieConsentFromStorage } from "@/lib/cookie-consent-storage.js";

/**
 * Verifică dacă utilizatorul a acceptat categoria **analytics** (localStorage).
 */
export function isAnalyticsConsentGranted(): boolean {
  const c = readCookieConsentFromStorage();
  return c?.analytics === true;
}

export function isMarketingConsentGranted(): boolean {
  const c = readCookieConsentFromStorage();
  return c?.marketing === true;
}

/**
 * Execută callback-ul doar dacă analytics este permis; altfel no-op.
 */
export function withAnalyticsConsent(fn: () => void): void {
  if (!isAnalyticsConsentGranted()) return;
  fn();
}

export function getStoredConsent(): CookieConsent | null {
  return readCookieConsentFromStorage();
}

/**
 * Punct unic de intrare din `main.tsx`: nu încarcă scripturi terțe fără consimțământ analytics.
 * Extinde aici cu import dinamic (ex. `import('…')`) când se adaugă un furnizor real.
 */
export function initDeferredAnalytics(): void {
  withAnalyticsConsent(() => {
    /* intentionally empty — placeholder pentru încărcare condiționată */
  });
}
