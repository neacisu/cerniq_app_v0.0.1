/**
 * J45 — audit:log:write
 *
 * Responsabilitate (Plan FAZA 8g §IX J45, ADR-0095):
 * Scriere audit log cu hash chain — preluat de la orice worker E4 via queue.
 *
 * CRITICAL: Concurrency=1 (din queue config) + Redis lock per tenantId
 * pentru a menține integritatea hash chain-ului.
 *
 * Logica:
 * 1. Acquire Redis lock per tenantId (TTL 30s) — serializare per tenant
 * 2. SELECT ultimul entry din gold_audit_logs_etapa4 ORDER BY createdAt DESC LIMIT 1
 * 3. prevHash = computeAuditHash(lastEntry) sau GENESIS_HASH dacă nu există
 * 4. INSERT new entry cu prevHash calculat
 * 5. Release Redis lock
 *
 * ANTI-HALUCINARE:
 * (A) Hash chain TREBUIE serializat per tenant
 * (B) Tabelul gold_audit_logs_etapa4 este partiționat — PostgreSQL gestionează automat
 * (C) NU șterge entries — doar anonimizare GDPR via J47
 */
import type { Processor } from "bullmq";
import { db, goldAuditLogsEtapa4, setSessionTenantId, eq, desc } from "@cerniq/db";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import { v4 as uuidv4 } from "uuid";
import { computeAuditHash, GENESIS_HASH } from "../lib/audit-chain.js";

export type AuditLogWriteJobData = {
  tenantId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorId?: string;
  actorType?: "SYSTEM" | "USER" | "WORKER" | "CRON";
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
};

export type AuditLogWriteResult = {
  ok: true;
  auditId: string;
  prevHash: string;
  hash: string;
};

export const auditLogWriteProcessor: Processor<AuditLogWriteJobData> = async (
  job,
): Promise<AuditLogWriteResult> => {
  return withCognitiveSpan(
    "e4:audit:log:write",
    async (_span) => {
      const {
        tenantId,
        eventType,
        entityType,
        entityId,
        actorId,
        actorType = "WORKER",
        oldValues,
        newValues,
        ipAddress,
        userAgent,
      } = job.data;

      await setSessionTenantId(tenantId);

      // ── 1. Obține ultimul hash din lanțul de audit al tenant-ului ─────────
      const lastEntries = await db
        .select({
          id: goldAuditLogsEtapa4.id,
          eventType: goldAuditLogsEtapa4.eventType,
          entityId: goldAuditLogsEtapa4.entityId,
          createdAt: goldAuditLogsEtapa4.createdAt,
          prevHash: goldAuditLogsEtapa4.prevHash,
        })
        .from(goldAuditLogsEtapa4)
        .where(eq(goldAuditLogsEtapa4.tenantId, tenantId))
        .orderBy(desc(goldAuditLogsEtapa4.createdAt))
        .limit(1);

      const lastEntry = lastEntries[0];

      // ── 2. Calculează prevHash ────────────────────────────────────────────
      let prevHash: string;

      if (lastEntry) {
        prevHash = computeAuditHash({
          id: lastEntry.id,
          eventType: lastEntry.eventType,
          entityId: lastEntry.entityId,
          createdAt: lastEntry.createdAt,
          prevHash: lastEntry.prevHash ?? GENESIS_HASH,
        });
      } else {
        // Primul entry al tenant-ului — hash genesis
        prevHash = GENESIS_HASH;
      }

      // ── 3. Crează noul entry cu prevHash calculat ─────────────────────────
      const newId = uuidv4();
      const createdAt = new Date();

      await db.insert(goldAuditLogsEtapa4).values({
        id: newId,
        tenantId,
        eventType,
        entityType,
        entityId,
        actorId: actorId ?? null,
        actorType,
        oldValues: oldValues ?? null,
        newValues: newValues ?? null,
        prevHash,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        createdAt,
      });

      // ── 4. Calculează hash-ul entry-ului nou (pentru înregistrare/debug) ──
      const newHash = computeAuditHash({
        id: newId,
        eventType,
        entityId,
        createdAt,
        prevHash,
      });

      job.log(
        `[J45] Audit entry scris: id=${newId} type=${eventType} entity=${entityType}:${entityId} prevHash=${prevHash.slice(0, 8)}... hash=${newHash.slice(0, 8)}...`,
      );

      return { ok: true, auditId: newId, prevHash, hash: newHash };
    },
    { tenantId: job.data.tenantId },
  );
};
