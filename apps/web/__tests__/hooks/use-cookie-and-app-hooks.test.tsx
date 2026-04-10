import type { ReactNode } from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { useCookieConsent } from "@/hooks/use-cookie-consent.js";
import {
  useAppNotifications,
  useMarkAllAppNotificationsRead,
  useMarkAppNotificationRead,
} from "@/hooks/use-app-notifications.js";
import { useBackgroundProcesses } from "@/hooks/use-background-processes.js";
import {
  CERNQ_COOKIE_CONSENT_KEY,
  writeCookieConsentToStorage,
} from "@/lib/cookie-consent-storage.js";
import { server } from "@/test-utils/msw/server.js";

describe("useCookieConsent", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("citește storage și reacționează la storage (cross-tab) și cookie-consent-changed", async () => {
    writeCookieConsentToStorage({ necessary: true, analytics: false, marketing: false });

    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.consent?.analytics).toBe(false);

    act(() => {
      localStorage.setItem(
        CERNQ_COOKIE_CONSENT_KEY,
        JSON.stringify({
          necessary: true,
          analytics: true,
          marketing: false,
          updatedAt: new Date().toISOString(),
        }),
      );
      globalThis.dispatchEvent(new StorageEvent("storage", { key: CERNQ_COOKIE_CONSENT_KEY }));
    });

    await waitFor(() => {
      expect(result.current.consent?.analytics).toBe(true);
    });

    act(() => {
      writeCookieConsentToStorage({ necessary: true, analytics: false, marketing: true });
      globalThis.dispatchEvent(new Event("cookie-consent-changed"));
    });

    await waitFor(() => {
      expect(result.current.consent?.marketing).toBe(true);
    });

    act(() => {
      result.current.refresh();
    });
  });
});

function withQuery(children: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useAppNotifications și useBackgroundProcesses", () => {
  beforeEach(() => {
    server.use(
      http.get("*/api/v1/notifications", () =>
        HttpResponse.json({
          success: true,
          data: { items: [], unreadCount: 0 },
        }),
      ),
      http.patch("*/api/v1/notifications/:id/read", () => HttpResponse.json({ success: true })),
      http.post("*/api/v1/notifications/read-all", () => HttpResponse.json({ success: true })),
      http.get("*/api/v1/system/processes", () =>
        HttpResponse.json({
          success: true,
          data: { processes: [], activeCount: 0, queuesReachable: true },
        }),
      ),
    );
  });

  it("încarcă notificări și procese de fundal", async () => {
    const n = renderHook(() => useAppNotifications(undefined, { enabled: true }), {
      wrapper: ({ children }) => withQuery(children),
    });
    await waitFor(() => {
      expect(n.result.current.isSuccess).toBe(true);
    });

    const p = renderHook(() => useBackgroundProcesses(true), {
      wrapper: ({ children }) => withQuery(children),
    });
    await waitFor(() => {
      expect(p.result.current.isSuccess).toBe(true);
    });

    const m = renderHook(() => useMarkAppNotificationRead(), {
      wrapper: ({ children }) => withQuery(children),
    });
    await act(async () => {
      m.result.current.mutate("n1");
    });
    await waitFor(() => {
      expect(m.result.current.isSuccess).toBe(true);
    });

    const all = renderHook(() => useMarkAllAppNotificationsRead(), {
      wrapper: ({ children }) => withQuery(children),
    });
    await act(async () => {
      all.result.current.mutate();
    });
    await waitFor(() => {
      expect(all.result.current.isSuccess).toBe(true);
    });
  });
});
