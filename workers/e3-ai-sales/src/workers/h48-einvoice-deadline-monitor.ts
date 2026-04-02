/**
 * H48 — einvoice:deadline:monitor (CRON: "0 9 * * *", PRIORITY 1 CRITICAL, concurrency:1)
 *
 * Monitorizează deadline-urile eFactura — AMENDĂ LEGALĂ 15-20% din valoare dacă nu se
 * încarcă în 5 zile calendaristice de la emitere!
 *
 * Pași: fetch submissions SENDING/SENT/PROCESSING/ERROR →
 *   JOIN oblioDocuments pentru total+series+number →
 *   calculare daysUntilDeadline → WARNING (1 zi) sau CRITICAL (0 sau sub 0) →
 *   pentru CRITICAL: enqueue H46 (force submission).
 *
 * ANTI-HALUCINARE:
 *   - PRIORITY 1 — cea mai critică operație din sistemul E3
 *   - daysUntilDeadline <= 0 → CRITICAL → force H46 + log console.error
 *   - daysUntilDeadline 1 → WARNING → log console.warn, NU force
 */
import type { Processor } from "bullmq";
import {
  db,
  setSessionTenantId,
  oblioDocuments,
  einvoiceSubmissions,
  eq,
  and,
  inArray,
} from "@cerniq/db";
import { createQueue, QUEUES } from "@cerniq/worker-shared";

const LOG = "[h48-einvoice-deadline-monitor]";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MONITORED_STATUSES = ["SENDING", "SENT", "PROCESSING", "ERROR"] as const;

export interface EinvoiceDeadlineMonitorJobData {
  tenantId: string;
  companyCif: string;
}

export interface EinvoiceDeadlineMonitorResult {
  ok: boolean;
  warningCount: number;
  criticalCount: number;
  forcedCount: number;
  totalRisk: number;
}

export const einvoiceDeadlineMonitorProcessor: Processor<
  EinvoiceDeadlineMonitorJobData,
  EinvoiceDeadlineMonitorResult
> = async (job) => {
  const { tenantId, companyCif } = job.data;

  await setSessionTenantId(tenantId);

  // 1. Fetch submissions monitorizate
  const submissions = await db
    .select({
      id: einvoiceSubmissions.id,
      oblioDocumentId: einvoiceSubmissions.oblioDocumentId,
      status: einvoiceSubmissions.status,
      deadlineAt: einvoiceSubmissions.deadlineAt,
    })
    .from(einvoiceSubmissions)
    .where(
      and(
        eq(einvoiceSubmissions.tenantId, tenantId),
        inArray(einvoiceSubmissions.status, [...MONITORED_STATUSES]),
      ),
    );

  if (submissions.length === 0) {
    return { ok: true, warningCount: 0, criticalCount: 0, forcedCount: 0, totalRisk: 0 };
  }

  // 2. Fetch oblioDocuments pentru total + series + number
  const docIds = [...new Set(submissions.map((s) => s.oblioDocumentId))];
  const docs = await db
    .select({
      id: oblioDocuments.id,
      series: oblioDocuments.series,
      number: oblioDocuments.number,
      total: oblioDocuments.total,
    })
    .from(oblioDocuments)
    .where(inArray(oblioDocuments.id, docIds));

  const docMap = new Map(docs.map((d) => [d.id, d]));

  let warningCount = 0;
  let criticalCount = 0;
  let forcedCount = 0;
  let totalRisk = 0;

  const sendQueue = createQueue(QUEUES.E3_EINVOICE_SEND);

  try {
    for (const sub of submissions) {
      const deadline = sub.deadlineAt;
      if (!deadline) continue;

      const daysUntilDeadline = Math.ceil((deadline.getTime() - Date.now()) / MS_PER_DAY);
      const doc = docMap.get(sub.oblioDocumentId);
      const totalValue = Number.parseFloat(String(doc?.total ?? "0"));

      if (daysUntilDeadline <= 1 && daysUntilDeadline > 0) {
        warningCount++;
        console.warn(
          `${LOG} WARNING EInvoiceDeadlineRisk tenantId=${tenantId} submissionId=${sub.id} daysUntilDeadline=${daysUntilDeadline}`,
        );
      } else if (daysUntilDeadline <= 0) {
        criticalCount++;
        totalRisk += totalValue;
        const riskPct = "15-20%";
        console.error(
          `${LOG} CRITICAL EInvoiceDeadlineRisk tenantId=${tenantId} submissionId=${sub.id} daysUntilDeadline=${daysUntilDeadline} amendă=${riskPct} din ${totalValue} RON — intervenție OBLIGATORIE!`,
        );

        // Force submission → enqueue H46
        await sendQueue.add("einvoice:send", {
          tenantId,
          oblioDocumentId: sub.oblioDocumentId,
          companyCif,
          actorId: "H48-force",
        });
        forcedCount++;
      }
    }
  } finally {
    await sendQueue.close();
  }

  return { ok: true, warningCount, criticalCount, forcedCount, totalRisk };
};
