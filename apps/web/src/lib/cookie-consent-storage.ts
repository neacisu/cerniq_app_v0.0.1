/** Cheie localStorage — contract stabil pentru banner, hook și analytics-guard. */
export const CERNQ_COOKIE_CONSENT_KEY = "cerniq_cookie_consent";

export type CookieConsent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

function parseStored(raw: string | null): CookieConsent | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    if (o.necessary !== true) return null;
    if (typeof o.analytics !== "boolean" || typeof o.marketing !== "boolean") return null;
    if (typeof o.updatedAt !== "string") return null;
    return {
      necessary: true,
      analytics: o.analytics,
      marketing: o.marketing,
      updatedAt: o.updatedAt,
    };
  } catch {
    return null;
  }
}

export function readCookieConsentFromStorage(): CookieConsent | null {
  if (globalThis.window === undefined) return null;
  return parseStored(globalThis.window.localStorage.getItem(CERNQ_COOKIE_CONSENT_KEY));
}

export function writeCookieConsentToStorage(
  consent: Omit<CookieConsent, "updatedAt"> & { updatedAt?: string },
): CookieConsent {
  const full: CookieConsent = {
    ...consent,
    necessary: true,
    updatedAt: consent.updatedAt ?? new Date().toISOString(),
  };
  globalThis.window?.localStorage.setItem(CERNQ_COOKIE_CONSENT_KEY, JSON.stringify(full));
  return full;
}
