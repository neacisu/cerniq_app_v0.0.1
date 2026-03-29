/**
 * Valoare returnată de Redis pentru cheia de status telefon (vezi getPhoneStatusKey).
 * Lipsă cheie (null) sau explicit ACTIVE → allocatorul poate confirma asignarea STICKY (ADR-0055).
 */
export function isRedisStatusAllowingStickyWa(status: string | null): boolean {
  return !status || status === "ACTIVE";
}
