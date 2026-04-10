/** Evită import circular `client.ts` ↔ `traced-postgres.ts` pentru măsurători lazy-pool. */

let initPerformanceMs: number | undefined;

export function markDbClientInitNow(): void {
  initPerformanceMs ??= performance.now();
}

/**
 * Timp `performance.now()` la primul `createDbClient` din proces.
 * Folosit în `traced-postgres.ts` pentru definirea operațională I6:
 * `connectLatencyMs` = milisecunde de la acest marcaj până la prima interogare
 * încheiată cu succes prin clientul învelit (include handshake-ul lazy al pool-ului la primul round-trip).
 */
export function getDbClientInitPerformanceMs(): number | undefined {
  return initPerformanceMs;
}
