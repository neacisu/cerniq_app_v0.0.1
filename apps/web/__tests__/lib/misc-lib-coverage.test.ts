import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  readCookieConsentFromStorage,
  writeCookieConsentToStorage,
  CERNQ_COOKIE_CONSENT_KEY,
} from "@/lib/cookie-consent-storage.js";
import { isDemoLoginCredentials, DEMO_LOGIN_CREDENTIALS } from "@/lib/demo-auth.js";
import {
  isAnalyticsConsentGranted,
  isMarketingConsentGranted,
  withAnalyticsConsent,
  getStoredConsent,
  initDeferredAnalytics,
} from "@/lib/analytics-guard.js";
import { getActivityStatus, queryErrorDetail, queryErrorMessage } from "@/pages/dashboard/utils.js";
import type { DashboardActivityItem } from "@/lib/etapa1-api.js";

describe("cookie-consent-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("parseStored: invalid JSON, obiect invalid, necessary false", () => {
    localStorage.setItem(CERNQ_COOKIE_CONSENT_KEY, "not-json{");
    expect(readCookieConsentFromStorage()).toBeNull();

    localStorage.setItem(CERNQ_COOKIE_CONSENT_KEY, JSON.stringify({ foo: 1 }));
    expect(readCookieConsentFromStorage()).toBeNull();

    localStorage.setItem(
      CERNQ_COOKIE_CONSENT_KEY,
      JSON.stringify({
        necessary: false,
        analytics: true,
        marketing: false,
        updatedAt: "x",
      }),
    );
    expect(readCookieConsentFromStorage()).toBeNull();
  });

  it("writeCookieConsentToStorage setează updatedAt implicit", () => {
    const c = writeCookieConsentToStorage({ necessary: true, analytics: true, marketing: false });
    expect(c.updatedAt).toMatch(/\d{4}/);
  });
});

describe("demo-auth", () => {
  it("recunoaște credențialele demo", () => {
    expect(isDemoLoginCredentials({ ...DEMO_LOGIN_CREDENTIALS })).toBe(true);
    expect(isDemoLoginCredentials({ email: "x", password: "y" })).toBe(false);
  });
});

describe("analytics-guard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reflectă consimțământul din storage", () => {
    expect(isAnalyticsConsentGranted()).toBe(false);
    writeCookieConsentToStorage({ necessary: true, analytics: true, marketing: false });
    expect(isAnalyticsConsentGranted()).toBe(true);
    expect(isMarketingConsentGranted()).toBe(false);
    expect(getStoredConsent()?.analytics).toBe(true);
  });

  it("withAnalyticsConsent și initDeferredAnalytics", () => {
    const fn = vi.fn();
    localStorage.removeItem(CERNQ_COOKIE_CONSENT_KEY);
    withAnalyticsConsent(fn);
    expect(fn).not.toHaveBeenCalled();

    writeCookieConsentToStorage({ necessary: true, analytics: true, marketing: false });
    withAnalyticsConsent(fn);
    expect(fn).toHaveBeenCalled();

    fn.mockClear();
    initDeferredAnalytics();
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("dashboard utils", () => {
  const base = (over: Partial<DashboardActivityItem>): DashboardActivityItem => ({
    id: "1",
    type: "task",
    timestamp: "t",
    message: "m",
    severity: null,
    ...over,
  });

  it("getActivityStatus și queryError*", () => {
    expect(getActivityStatus(base({ severity: "CRITICAL" }))).toBe("error");
    expect(getActivityStatus(base({ severity: "something error" }))).toBe("error");
    expect(getActivityStatus(base({ type: "approval_pending", severity: null }))).toBe("warning");
    expect(getActivityStatus(base({ type: "x", severity: "ok" }))).toBe("info");

    expect(queryErrorDetail(new Error("e"), "fb")).toBe("e");
    expect(queryErrorDetail("x", "fb")).toBe("fb");
    expect(queryErrorMessage("z")).toBe("Eroare API");
  });
});
