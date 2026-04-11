const SESSION_CORR_KEY = "cerniq_admin_x_correlation_id";

function hasBrowserWindow(): boolean {
  return globalThis.window !== undefined;
}

export function getAdminSessionCorrelationId(): string {
  if (!hasBrowserWindow()) return "";
  try {
    let id = globalThis.sessionStorage.getItem(SESSION_CORR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      globalThis.sessionStorage.setItem(SESSION_CORR_KEY, id);
    }
    return id;
  } catch {
    return globalThis.crypto.randomUUID();
  }
}
