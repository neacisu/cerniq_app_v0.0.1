/** Bază API admin — extras pentru excludere din pragul Vitest pe ramura host (vezi ADR-0029 / registru tier). */
function hasBrowserWindow(): boolean {
  return globalThis.window !== undefined;
}

export function getApiBase(): string {
  const env = import.meta.env as { VITE_API_URL?: string; DEV?: boolean };
  if (env.VITE_API_URL) return env.VITE_API_URL.replace(/\/$/, "");
  if (env.DEV) return "http://localhost:64010";
  const location = hasBrowserWindow() ? globalThis.window.location : null;
  if (location?.hostname) {
    const host = location.hostname.replace(/^admin\./, "api.");
    const proto = location.protocol || "https:";
    return `${proto}//${host}`;
  }
  return "";
}
