/**
 * J47 — audit:data:anonymize
 *
 * Responsabilitate (Plan FAZA 8g §IX J47, GDPR):
 * Cron `0 2 * * 0` (duminică, Plan L2134) — anonimizare GDPR entries >7 ani.
 *
 * Logica:
 * 1. SELECT entries WHERE createdAt < NOW() - INTERVAL '7 years'
 * 2. Anonimizare: UPDATE oldValues/newValues → remove PII fields
 *    - Păstrează structura JSONB dar sanitizează valorile PII
 *    - NU șterge entries — chain-ul rămâne intact
 * 3. UPDATE actorId = NULL (anonimizare actor)
 *
 * PII fields eliminate: email, phone, address, name, cui, cnp, iban
 *
 * ANTI-HALUCINARE:
 * (D) Anonimizare GDPR NU șterge entries — doar sanitizează PII din JSONB
 * - Cron EXACT: 0 2 * * 0 (duminică)
 * - Retenție legală: 7 ani
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, sql } from "@cerniq/db";
import { withCognitiveSpan } from "@cerniq/worker-shared";

export type AuditDataAnonymizeJobData = {
  tenantId: string;
  correlationId?: string;
};

export type AuditDataAnonymizeResult = {
  ok: true;
  tenantId: string;
  anonymizedCount: number;
};

/** Câmpuri PII de sanitizat din JSONB — unica sursă de adevăr pentru GDPR anonymization.
 *
 * Notă: 'ipAddress' și 'userAgent' sunt sanitizate ATÂT ca JSONB keys (prin IN clause)
 * CÂT ȘI ca coloane SQL dedicate (ip_address, user_agent) prin SET direct.
 */
const PII_FIELDS = [
  "email",
  "phone",
  "phoneNumber",
  "address",
  "name",
  "firstName",
  "lastName",
  "numeComplet",
  "cui",
  "cnp",
  "iban",
  "bankAccount",
  "ipAddress",
  "userAgent",
] as const;

/**
 * Fragment SQL pentru clauza IN — derivat automat din PII_FIELDS (unica sursă de adevăr).
 * PII_FIELDS este definit static în cod (nu din input utilizator) — zero risc SQL injection.
 */
const PII_SQL_IN_CLAUSE = sql.raw(PII_FIELDS.map((f) => `'${f}'`).join(","));

export const auditDataAnonymizeProcessor: Processor<AuditDataAnonymizeJobData> = async (
  job,
): Promise<AuditDataAnonymizeResult> => {
  return withCognitiveSpan(
    "e4:audit:data:anonymize",
    async (_span) => {
      const { tenantId } = job.data;
      await setSessionTenantId(tenantId);

      // ── 1. Anonimizare entries > 7 ani ────────────────────────────────────
      // PII_SQL_IN_CLAUSE derivă automat din PII_FIELDS (DRY — un singur loc de editare)
      const result = await db.execute(
        sql`
          UPDATE gold.gold_audit_logs_etapa4
          SET
            old_values = CASE
              WHEN old_values IS NOT NULL
              THEN (
                SELECT jsonb_object_agg(key,
                  CASE WHEN key IN (${PII_SQL_IN_CLAUSE}) THEN '"[ANONYMIZED]"'::jsonb ELSE value END
                )
                FROM jsonb_each(old_values)
              )
              ELSE NULL
            END,
            new_values = CASE
              WHEN new_values IS NOT NULL
              THEN (
                SELECT jsonb_object_agg(key,
                  CASE WHEN key IN (${PII_SQL_IN_CLAUSE}) THEN '"[ANONYMIZED]"'::jsonb ELSE value END
                )
                FROM jsonb_each(new_values)
              )
              ELSE NULL
            END,
            actor_id = NULL,
            ip_address = '[ANONYMIZED]',
            user_agent = '[ANONYMIZED]'
          WHERE
            tenant_id = ${tenantId}
            AND created_at < NOW() - INTERVAL '7 years'
        `,
      );

      const anonymizedCount = (result as { rowCount?: number }).rowCount ?? 0;

      job.log(
        `[J47] GDPR anonymize complet: tenant=${tenantId} anonymized=${anonymizedCount} entries`,
      );

      return { ok: true, tenantId, anonymizedCount };
    },
    { tenantId: job.data.tenantId },
  );
};
