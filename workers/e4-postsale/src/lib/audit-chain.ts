/**
 * audit-chain.ts — SHA-256 Hash Chain pentru Audit Log E4
 *
 * Implementare ADR-0095: hash chain garantează integritatea auditului.
 * Orice modificare retroactivă a unui entry invalidează toate hash-urile ulterioare.
 *
 * Formula: sha256(id || eventType || entityId || createdAt.toISOString() || prevHash)
 *
 * ANTI-HALUCINARE:
 * - prevHash pentru primul entry al unui tenant = "0000...0000" (64 zerouri)
 * - NU se modifică niciodată un entry existent — doar anonimizare GDPR (J47)
 * - Verificarea completă se face în J46 (audit:chain:verify)
 */
import { createHash } from "node:crypto";

/** Hash inițial (genesis) pentru primul entry al unui tenant — 64 caractere hex zerouri */
export const GENESIS_HASH = "0".repeat(64);

export interface AuditHashEntry {
  id: string;
  eventType: string;
  entityId: string;
  createdAt: Date;
  prevHash: string;
}

/**
 * Calculează SHA-256 hash pentru un entry din audit log.
 * Formula exactă din Plan ADR-0095:
 *   sha256(id || eventType || entityId || createdAt.toISOString() || prevHash)
 */
export function computeAuditHash(entry: AuditHashEntry): string {
  return createHash("sha256")
    .update(
      entry.id + entry.eventType + entry.entityId + entry.createdAt.toISOString() + entry.prevHash,
    )
    .digest("hex");
}

/**
 * Verifică integritatea unui lanț de audit entries.
 *
 * Algoritmul:
 * 1. Sortează entries după createdAt ASC (ordinea corectă a lanțului)
 * 2. Pentru fiecare entry[i], recalculează hash-ul
 * 3. Verifică că entry[i+1].prevHash === computeAuditHash(entry[i])
 *
 * Returns: { valid: true } sau { valid: false, firstBrokenIndex: number, expectedHash: string, actualHash: string }
 */
export function verifyAuditChain(
  entries: AuditHashEntry[],
):
  | { valid: true }
  | { valid: false; firstBrokenIndex: number; expectedHash: string; actualHash: string } {
  if (entries.length === 0) {
    return { valid: true };
  }

  for (let i = 0; i < entries.length - 1; i++) {
    const current = entries[i];
    const next = entries[i + 1];
    const expectedHash = computeAuditHash(current);

    if (next.prevHash !== expectedHash) {
      return {
        valid: false,
        firstBrokenIndex: i + 1,
        expectedHash,
        actualHash: next.prevHash,
      };
    }
  }

  return { valid: true };
}
