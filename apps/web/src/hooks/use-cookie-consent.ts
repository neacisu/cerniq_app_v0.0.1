import { useCallback, useEffect, useState } from "react";
import type { CookieConsent } from "@/lib/cookie-consent-storage.js";
import * as CCS from "@/lib/cookie-consent-storage.js";

export type { CookieConsent } from "@/lib/cookie-consent-storage.js";
export { CERNQ_COOKIE_CONSENT_KEY } from "@/lib/cookie-consent-storage.js";

/**
 * Stare consimțământ cookie-uri: citește localStorage la mount, reacționează la evenimentul
 * `cookie-consent-changed` (emis la salvare din banner).
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(() =>
    CCS.readCookieConsentFromStorage(),
  );

  const refresh = useCallback(() => {
    setConsent(CCS.readCookieConsentFromStorage());
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CCS.CERNQ_COOKIE_CONSENT_KEY) refresh();
    };
    const onCustom = () => refresh();
    globalThis.window?.addEventListener("storage", onStorage);
    globalThis.window?.addEventListener("cookie-consent-changed", onCustom);
    return () => {
      globalThis.window?.removeEventListener("storage", onStorage);
      globalThis.window?.removeEventListener("cookie-consent-changed", onCustom);
    };
  }, [refresh]);

  return { consent, setConsent, refresh };
}
