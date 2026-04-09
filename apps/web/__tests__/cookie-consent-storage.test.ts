import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  CERNQ_COOKIE_CONSENT_KEY,
  readCookieConsentFromStorage,
  writeCookieConsentToStorage,
} from "../src/lib/cookie-consent-storage.js";
import { isAnalyticsConsentGranted, withAnalyticsConsent } from "../src/lib/analytics-guard.js";

describe("cookie-consent-storage + analytics-guard", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("persistă și citește consimțământul", () => {
    const c = writeCookieConsentToStorage({ necessary: true, analytics: true, marketing: false });
    expect(c.necessary).toBe(true);
    expect(c.analytics).toBe(true);
    expect(c.marketing).toBe(false);
    const raw = localStorage.getItem(CERNQ_COOKIE_CONSENT_KEY);
    expect(raw).toBeTruthy();
    const again = readCookieConsentFromStorage();
    expect(again?.analytics).toBe(true);
  });

  it("analytics-guard: fără consimțământ nu rulează callback", () => {
    let n = 0;
    withAnalyticsConsent(() => {
      n += 1;
    });
    expect(n).toBe(0);
    writeCookieConsentToStorage({ necessary: true, analytics: true, marketing: false });
    withAnalyticsConsent(() => {
      n += 1;
    });
    expect(n).toBe(1);
    expect(isAnalyticsConsentGranted()).toBe(true);
  });
});
