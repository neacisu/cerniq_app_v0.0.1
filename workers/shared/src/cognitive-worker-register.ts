/**
 * Etapa catalog (1–5) pentru procesul curent — folosită la rezolvarea `nodeKey` când același
 * `queueName` apare pe mai multe etape. Apel din bootstrap-ul fiecărui binar worker înainte de `createWorker`.
 * Opțional: `COGNITIVE_WORKER_ETAPA` în env (număr) suprascrie dacă nu s-a apelat `registerCognitiveWorkerEtapa`.
 */
let registeredEtapa: number | undefined;

export function registerCognitiveWorkerEtapa(etapa: number): void {
  if (!Number.isFinite(etapa) || etapa < 1 || etapa > 9) {
    throw new Error(`registerCognitiveWorkerEtapa: etapa invalidă (${etapa})`);
  }
  registeredEtapa = Math.floor(etapa);
}

export function getRegisteredCognitiveWorkerEtapa(): number | undefined {
  if (registeredEtapa !== undefined) return registeredEtapa;
  const raw = process.env.COGNITIVE_WORKER_ETAPA?.trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : undefined;
}
