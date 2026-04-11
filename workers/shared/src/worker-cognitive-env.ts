/** Parsare `WORKER_COGNITIVE_INSTRUMENTATION` — implicit activ (enterprise Brain), dezactivat explicit cu 0/false/no/off. */
export function parseWorkerCognitiveInstrumentationEnv(raw: string | undefined): boolean {
  if (raw === undefined || raw === "") return true;
  const t = raw.trim().toLowerCase();
  return t !== "0" && t !== "false" && t !== "no" && t !== "off";
}
