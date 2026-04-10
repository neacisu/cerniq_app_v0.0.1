import type { Processor } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import {
  db,
  setSessionTenantId,
  silverCompanies,
  silverContacts,
  silverEnrichmentLog,
  sql,
} from "@cerniq/db";
import { createJobLogger } from "../lib/job-logger.js";
import { phoneLast4 } from "../lib/phone-last4.js";

const svcLog = createServiceLogger("h3-carrier-detection", { etapa: "e1" });

export type CarrierDetectionJobData = {
  tenantId: string;
  entityType: "company" | "contact";
  entityId: string;
  phone: string;
  correlationId?: string;
};

const ROMANIAN_PREFIXES: Record<string, { carrier: string; type: "MOBILE" | "FIXED" }> = {
  "072": { carrier: "Vodafone", type: "MOBILE" },
  "073": { carrier: "Vodafone", type: "MOBILE" },
  "074": { carrier: "Orange", type: "MOBILE" },
  "075": { carrier: "Orange", type: "MOBILE" },
  "076": { carrier: "Digi/Telekom", type: "MOBILE" },
  "077": { carrier: "Digi/Vodafone", type: "MOBILE" },
  "078": { carrier: "Orange/Vodafone", type: "MOBILE" },
  "079": { carrier: "Orange/Vodafone", type: "MOBILE" },
  "021": { carrier: "Bucuresti", type: "FIXED" },
  "031": { carrier: "Bucuresti", type: "FIXED" },
  "0239": { carrier: "Braila", type: "FIXED" },
};

function normalizeToNational(phone: string): string {
  return phone.replace(/^\+40/, "0").replace(/^40/, "0").replaceAll(/[^\d]/g, "");
}

function detectCarrier(phone: string): { carrier: string; type: "MOBILE" | "FIXED" } | null {
  const national = normalizeToNational(phone);
  const prefix4 = national.slice(0, 4);
  const prefix3 = national.slice(0, 3);
  return ROMANIAN_PREFIXES[prefix4] ?? ROMANIAN_PREFIXES[prefix3] ?? null;
}

export const carrierDetectionProcessor: Processor<CarrierDetectionJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:enrich:phone-carrier",
    async (_span) => {
      const startedAt = Date.now();
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "H3:carrier-detection",
        jobId: String(job.id ?? ""),
        startedAt,
        etapa: "e1",
        correlationId: job.data.correlationId,
        entityType: job.data.entityType,
        entityId: job.data.entityId,
      });

      try {
        svcLog.info(
          { tenantId: job.data.tenantId, phoneLast4: phoneLast4(job.data.phone) },
          "H3 carrier heuristic",
        );
        await setSessionTenantId(job.data.tenantId);

        const detected = detectCarrier(job.data.phone);
        if (!detected) {
          log.info("unknown_carrier", "Prefix necunoscut", {
            phoneLast4: phoneLast4(job.data.phone),
          });
          return { ok: true, status: "unknown_carrier", phone: job.data.phone };
        }

        const patch = {
          carrierDetection: {
            phone: job.data.phone,
            carrier: detected.carrier,
            phoneType: detected.type,
            detectedAt: new Date().toISOString(),
          },
        };

        if (job.data.entityType === "company") {
          await db
            .update(silverCompanies)
            .set({
              metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{carrierDetection}', ${JSON.stringify(patch.carrierDetection)}::jsonb)`,
              updatedAt: new Date(),
            })
            .where(sql`${silverCompanies.id} = ${job.data.entityId}`);
        } else {
          await db
            .update(silverContacts)
            .set({
              metadata: sql`jsonb_set(COALESCE(${silverContacts.metadata}, '{}'::jsonb), '{carrierDetection}', ${JSON.stringify(patch.carrierDetection)}::jsonb)`,
              updatedAt: new Date(),
            })
            .where(sql`${silverContacts.id} = ${job.data.entityId}`);
        }

        await db.insert(silverEnrichmentLog).values({
          tenantId: job.data.tenantId,
          entityType: job.data.entityType,
          entityId: job.data.entityId,
          source: "carrier_detection",
          operation: "detect",
          requestPayload: { phone: job.data.phone },
          responsePayload: detected,
          fieldsUpdated: ["metadata"],
          correlationId: job.data.correlationId,
          jobId: String(job.id ?? ""),
          durationMs: Date.now() - startedAt,
        });

        log.step("done", "Carrier detectat", {
          phoneLast4: phoneLast4(job.data.phone),
          carrier: detected.carrier,
          phoneType: detected.type,
          latencyMs: Date.now() - startedAt,
        });

        return { ok: true, status: "success", carrier: detected.carrier, phoneType: detected.type };
      } catch (error) {
        log.error(
          "fatal",
          `Carrier detection eșuat: ${error instanceof Error ? error.message : String(error)}`,
          {
            ...enrichError(error, {
              tenantId: job.data.tenantId,
              entityType: job.data.entityType,
              entityId: job.data.entityId,
              phoneLast4: phoneLast4(job.data.phone),
            }),
          },
        );
        throw error;
      }
    },
    { tenantId: job.data.tenantId },
  );
};
