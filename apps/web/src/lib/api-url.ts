/**
 * Centralized API base URL detection for web app.
 * Used by api.ts and data-provider to avoid duplication.
 */
function getBrowserWindow(): Window | null {
  return globalThis.window ?? null;
}

export function getApiBase(): string {
  const env = (import.meta as unknown as { env?: { VITE_API_URL?: string; DEV?: boolean } }).env;
  if (env?.VITE_API_URL) return env.VITE_API_URL.replace(/\/$/, "");
  const browserWindow = getBrowserWindow();
  if (browserWindow?.location?.hostname) {
    const { protocol, hostname } = browserWindow.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return env?.DEV ? "" : "http://localhost:64010";
    }
    if (hostname.includes("dev.") && env?.DEV) {
      return "";
    }
    if (hostname.includes("admin.")) {
      return `${protocol}//api.${hostname.replace("admin.", "")}`;
    }
    return `${protocol}//api.${hostname}`;
  }
  if (env?.DEV) return "";
  return "";
}

export const REDIRECT_LOGIN_EVENT = "cerniq:redirect-to-login";

export function requestRedirectToLogin(): void {
  const browserWindow = getBrowserWindow();
  if (browserWindow) {
    browserWindow.dispatchEvent(new CustomEvent(REDIRECT_LOGIN_EVENT));
  }
}
