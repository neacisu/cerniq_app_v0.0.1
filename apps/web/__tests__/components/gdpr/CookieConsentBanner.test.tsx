/**
 * Banner GDPR: persistență, audit fetch, dialog preferințe, context auth opțional.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CERNQ_COOKIE_CONSENT_KEY } from "@/lib/cookie-consent-storage.js";
import { CookieConsentBanner } from "@/components/gdpr/CookieConsentBanner.js";

vi.mock("@/lib/api-url.js", () => ({
  getApiBase: () => "http://localhost",
}));

describe("CookieConsentBanner", () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });

  beforeEach(() => {
    globalThis.localStorage.removeItem(CERNQ_COOKIE_CONSENT_KEY);
    globalThis.localStorage.removeItem("cerniq_user");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("nu afișează nimic dacă există deja consimțământ în storage", () => {
    globalThis.localStorage.setItem(
      CERNQ_COOKIE_CONSENT_KEY,
      JSON.stringify({
        necessary: true,
        analytics: false,
        marketing: false,
        updatedAt: new Date().toISOString(),
      }),
    );
    render(<CookieConsentBanner />);
    expect(screen.queryByText(/Cookie-uri și confidențialitate/i)).not.toBeInTheDocument();
  });

  it("Acceptă tot persistă, trimite audit și ascunde bannerul", async () => {
    const user = userEvent.setup();
    render(<CookieConsentBanner />);
    expect(screen.getByText(/Cookie-uri și confidențialitate/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Acceptă tot/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Cookie-uri și confidențialitate/i)).not.toBeInTheDocument();
    });
    expect(globalThis.localStorage.getItem(CERNQ_COOKIE_CONSENT_KEY)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost/api/v1/gdpr/consent-log",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as { body: string }).body);
    expect(body.consentCategories).toEqual({ necessary: true, analytics: true, marketing: true });
  });

  it("Respinge tot salvează analytics=false, marketing=false", async () => {
    const user = userEvent.setup();
    render(<CookieConsentBanner />);
    await user.click(screen.getByRole("button", { name: /Respinge tot/i }));
    await waitFor(() => {
      expect(screen.queryByText(/Cookie-uri și confidențialitate/i)).not.toBeInTheDocument();
    });
    const raw = globalThis.localStorage.getItem(CERNQ_COOKIE_CONSENT_KEY);
    if (!raw) throw new Error("expected consent in storage");
    const parsed = JSON.parse(raw) as { analytics: boolean; marketing: boolean };
    expect(parsed.analytics).toBe(false);
    expect(parsed.marketing).toBe(false);
  });

  it("Preferințe: modifică checkbox-uri și Salvează", async () => {
    const user = userEvent.setup();
    render(<CookieConsentBanner />);
    await user.click(screen.getByRole("button", { name: /Preferințe/i }));

    expect(screen.getByRole("heading", { name: /Preferințe cookie/i })).toBeInTheDocument();
    await user.click(screen.getByLabelText(/Analiză/i));
    await user.click(screen.getByLabelText(/Marketing/i));
    await user.click(screen.getByRole("button", { name: /^Salvează$/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Cookie-uri și confidențialitate/i)).not.toBeInTheDocument();
    });
    const raw = globalThis.localStorage.getItem(CERNQ_COOKIE_CONSENT_KEY);
    if (!raw) throw new Error("expected consent in storage");
    const parsed = JSON.parse(raw) as { analytics: boolean; marketing: boolean };
    expect(parsed.analytics).toBe(true);
    expect(parsed.marketing).toBe(true);
  });

  it("Anulează închide dialogul fără a marca saved", async () => {
    const user = userEvent.setup();
    render(<CookieConsentBanner />);
    await user.click(screen.getByRole("button", { name: /Preferințe/i }));
    await user.click(screen.getByRole("button", { name: /^Anulează$/i }));
    expect(screen.getByText(/Cookie-uri și confidențialitate/i)).toBeInTheDocument();
    expect(globalThis.localStorage.getItem(CERNQ_COOKIE_CONSENT_KEY)).toBeNull();
  });

  it("audit include tenantId și userId din cerniq_user", async () => {
    globalThis.localStorage.setItem(
      "cerniq_user",
      JSON.stringify({ id: "user-1", tenantId: "ten-9" }),
    );
    const user = userEvent.setup();
    render(<CookieConsentBanner />);
    await user.click(screen.getByRole("button", { name: /Respinge tot/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as { body: string }).body);
    expect(body.tenantId).toBe("ten-9");
    expect(body.userId).toBe("user-1");
  });
});
