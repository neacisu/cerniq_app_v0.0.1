import { useCallback, useEffect, useRef, useState } from "react";
import { getApiBase } from "@/lib/api-url.js";
import { getSessionCorrelationId } from "@/lib/report-client-error.js";
import {
  writeCookieConsentToStorage,
  readCookieConsentFromStorage,
  type CookieConsent,
} from "@/lib/cookie-consent-storage.js";

const USER_KEY = "cerniq_user";

function readOptionalAuthContext(): { tenantId: string | null; userId: string | null } {
  if (globalThis.window === undefined) return { tenantId: null, userId: null };
  try {
    const raw = globalThis.window.localStorage.getItem(USER_KEY);
    if (!raw) return { tenantId: null, userId: null };
    const u = JSON.parse(raw) as { id?: string; tenantId?: string };
    return {
      userId: typeof u.id === "string" ? u.id : null,
      tenantId: typeof u.tenantId === "string" ? u.tenantId : null,
    };
  } catch (err) {
    console.warn("[gdpr] readOptionalAuthContext: invalid user JSON", {
      err: err instanceof Error ? err.message : String(err),
    });
    return { tenantId: null, userId: null };
  }
}

async function postConsentAudit(consent: CookieConsent): Promise<void> {
  const base = getApiBase().replace(/\/$/, "");
  const url = `${base}/api/v1/gdpr/consent-log`;
  const { tenantId, userId } = readOptionalAuthContext();
  const token =
    globalThis.window === undefined ? null : globalThis.window.localStorage.getItem("cerniq_token");
  const cid = getSessionCorrelationId();
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(cid ? { "x-correlation-id": cid } : {}),
      },
      body: JSON.stringify({
        tenantId,
        userId,
        consentCategories: {
          necessary: true,
          analytics: consent.analytics,
          marketing: consent.marketing,
        },
        timestamp: consent.updatedAt,
      }),
    });
  } catch (err) {
    console.warn("[gdpr] consent-log audit fetch failed (best-effort)", {
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

function emitConsentChanged(): void {
  globalThis.window?.dispatchEvent(new Event("cookie-consent-changed"));
}

/**
 * Banner GDPR (ePrivacy): categorii Necessary (mereu activ), Analytics, Marketing.
 * Afișat doar când nu există consimțământ salvat în localStorage.
 */
export function CookieConsentBanner() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState({ analytics: false, marketing: false });
  const [saved, setSaved] = useState(() => readCookieConsentFromStorage() !== null);
  const prefsDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = prefsDialogRef.current;
    if (!el) return;
    if (open) {
      el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  const persist = useCallback(async (analytics: boolean, marketing: boolean) => {
    const consent = writeCookieConsentToStorage({
      necessary: true,
      analytics,
      marketing,
    });
    emitConsentChanged();
    await postConsentAudit(consent);
    setSaved(true);
    setOpen(false);
  }, []);

  if (saved) return null;

  return (
    <>
      <aside
        aria-labelledby="cerniq-cookie-banner-title"
        className="fixed inset-x-0 bottom-0 border-t border-[oklch(0.22_0.018_255/60%)] bg-[var(--color-s900)] px-4 py-4 shadow-[var(--shadow-lg)] md:px-8"
        style={{ zIndex: "var(--z-modal)" }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2
              id="cerniq-cookie-banner-title"
              className="font-display text-sm font-semibold text-[var(--color-t1)]"
            >
              Cookie-uri și confidențialitate
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-t3)]">
              Folosim cookie-uri necesare pentru funcționarea aplicației. Cu acordul tău putem
              folosi cookie-uri pentru analiză și marketing. Poți modifica preferințele oricând din
              această zonă.
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-[var(--radius-md)] border border-[oklch(0.22_0.018_255/60%)] px-3 py-2 text-xs font-medium text-[var(--color-t2)] transition hover:bg-[var(--color-s800)]"
              onClick={() => void persist(false, false)}
            >
              Respinge tot
            </button>
            <button
              type="button"
              className="rounded-[var(--radius-md)] border border-transparent bg-[var(--color-b5)] px-3 py-2 text-xs font-semibold text-[var(--color-s950)] shadow-sm transition hover:opacity-95"
              onClick={() => void persist(true, true)}
            >
              Acceptă tot
            </button>
            <button
              type="button"
              className="rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium text-[var(--color-b5)] underline-offset-2 hover:underline"
              onClick={() => setOpen(true)}
            >
              Preferințe
            </button>
          </div>
        </div>
      </aside>

      <dialog
        ref={prefsDialogRef}
        className="fixed inset-0 z-[calc(var(--z-modal)+1)] m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-0 [&::backdrop]:bg-black/50"
        style={{ zIndex: "calc(var(--z-modal) + 1)" }}
        aria-labelledby="cerniq-cookie-prefs-title"
        onClose={() => setOpen(false)}
      >
        <div className="flex min-h-full items-end justify-center p-4 md:items-center">
          <div className="relative w-full max-w-lg rounded-[var(--radius-lg)] border border-[oklch(0.22_0.018_255/60%)] bg-[var(--color-s900)] p-6 shadow-[var(--shadow-lg)]">
            <h3
              id="cerniq-cookie-prefs-title"
              className="font-display text-base font-semibold text-[var(--color-t1)]"
            >
              Preferințe cookie
            </h3>
            <ul className="mt-4 space-y-4">
              <li className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[var(--color-t1)]">Necesare</p>
                  <p className="text-xs text-[var(--color-t3)]">
                    Mereu active. Autentificare, securitate, sesiune.
                  </p>
                </div>
                <span className="text-xs font-medium text-[var(--color-ok)]">Activ</span>
              </li>
              <li className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <label htmlFor="cerniq-cookie-analytics" className="block cursor-pointer">
                    <span className="text-sm font-medium text-[var(--color-t1)]">Analiză</span>
                    <span className="mt-1 block text-xs text-[var(--color-t3)]">
                      Măsurare anonimizată a utilizării produsului.
                    </span>
                  </label>
                </div>
                <input
                  id="cerniq-cookie-analytics"
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 rounded border-[oklch(0.22_0.018_255/60%)] bg-[var(--color-s800)] accent-[var(--color-b5)]"
                  checked={prefs.analytics}
                  onChange={(e) => setPrefs((p) => ({ ...p, analytics: e.target.checked }))}
                />
              </li>
              <li className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <label htmlFor="cerniq-cookie-marketing" className="block cursor-pointer">
                    <span className="text-sm font-medium text-[var(--color-t1)]">Marketing</span>
                    <span className="mt-1 block text-xs text-[var(--color-t3)]">
                      Conținut personalizat și campanii relevante.
                    </span>
                  </label>
                </div>
                <input
                  id="cerniq-cookie-marketing"
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 rounded border-[oklch(0.22_0.018_255/60%)] bg-[var(--color-s800)] accent-[var(--color-b5)]"
                  checked={prefs.marketing}
                  onChange={(e) => setPrefs((p) => ({ ...p, marketing: e.target.checked }))}
                />
              </li>
            </ul>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-[var(--radius-md)] px-3 py-2 text-xs text-[var(--color-t3)] hover:text-[var(--color-t1)]"
                onClick={() => setOpen(false)}
              >
                Anulează
              </button>
              <button
                type="button"
                className="rounded-[var(--radius-md)] bg-[var(--color-b5)] px-4 py-2 text-xs font-semibold text-[var(--color-s950)]"
                onClick={() => void persist(prefs.analytics, prefs.marketing)}
              >
                Salvează
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
