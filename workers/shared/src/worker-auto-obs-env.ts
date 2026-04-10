/** Parsare `WORKER_AUTO_OBSERVABILITY` — modul fără side-effects pentru teste stabile. */
export function parseWorkerAutoObservabilityEnv(raw: string | undefined): boolean {
  const t = raw?.trim().toLowerCase();
  return t === "1" || t === "true" || t === "yes";
}
