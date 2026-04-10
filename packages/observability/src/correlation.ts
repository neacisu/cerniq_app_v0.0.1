/**
 * Context de corelare per-async-scope (workers, script-uri) via AsyncLocalStorage.
 * Pentru HTTP, folosiți `enterCorrelationContext()` în hook-ul de request după ce headerele sunt cunoscute.
 */
import { AsyncLocalStorage } from "node:async_hooks";

export type CorrelationStore = {
  correlationId: string;
  requestId?: string;
  /** Opțional — populat din `request.tenantId` / worker. */
  tenantId?: string;
  /** Opțional — populat din JWT / worker. */
  userId?: string;
  /** Opțional — din span activ sau propagare explicită. */
  traceId?: string;
};

const storage = new AsyncLocalStorage<CorrelationStore>();

export function getCorrelationStore(): CorrelationStore | undefined {
  return storage.getStore();
}

/** Rulează `fn` cu store-ul setat (recomandat în worker la începutul job-ului). */
export function runWithCorrelation<T>(store: CorrelationStore, fn: () => T): T {
  return storage.run(store, fn);
}

/**
 * Atașează contextul curent la firul async curent (Node enterWith).
 * Folosit la intrarea în pipeline-ul HTTP după ce headerele sunt cunoscute.
 */
export function enterCorrelationContext(store: CorrelationStore): void {
  storage.enterWith(store);
}

/**
 * Alias API `CorrelationContext` — același storage ca `runWithCorrelation` / `getCorrelationStore`.
 * `getCorrelationId()` returnează `correlationId` din store sau `undefined` dacă nu există context (generarea UUID pentru request-uri HTTP rămâne în plugin-ul de logging).
 */
export const CorrelationContext = {
  run: runWithCorrelation,
  get: getCorrelationStore,
  getCorrelationId(): string | undefined {
    return getCorrelationStore()?.correlationId;
  },
} as const;
