import type { Processor } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { createJobLogger } from "../lib/job-logger.js";

const svcLog = createServiceLogger("l2-ouai-membership", { etapa: "e1" });

export type OuaiMembershipJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

export const ouaiMembershipProcessor: Processor<OuaiMembershipJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:agri:ouai",
    async (_span) => {
      const startedAt = Date.now();
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "L2:ouai-membership",
        jobId: String(job.id ?? ""),
        startedAt,
        etapa: "e1",
        correlationId: job.data.correlationId,
        entityType: "company",
        entityId: job.data.companyId,
      });
      try {
        await setSessionTenantId(job.data.tenantId);
        svcLog.info({ tenantId: job.data.tenantId, companyId: job.data.companyId }, "L2 OUAI");
        const company = await db.query.silverCompanies.findFirst({
          where: (t, { and, eq }) =>
            and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
        });
        if (!company) return { ok: false, status: "not_found" };

        const metadata = (company.metadata as Record<string, unknown>) ?? {};
        const proximity = metadata.proximity as Record<string, unknown> | undefined;
        const geocoding = metadata.geocoding as Record<string, unknown> | undefined;
        const apiaData = metadata.apiaData as Record<string, unknown> | undefined;

        const apiaPayloadText = JSON.stringify(apiaData?.payload ?? {}).toLowerCase();
        const directOuaiSignals = [
          /\bouai\b/,
          /\borganizatia utilizatorilor de apa/i,
          /\borganizatie a utilizatorilor de apa/i,
          /\birigat/i,
          /\bamenajare de irigatii/i,
          /\bcanal(ul)? principal/i,
        ];
        const hasDirectSignal = directOuaiSignals.some((rx) => rx.test(apiaPayloadText));
        const hasIrrigationGeoContext =
          Boolean(proximity?.nearbyAgriculturalCount) &&
          Boolean(geocoding?.accuracy) &&
          /(campie|irig|canal)/i.test(
            `${company.adresa || ""} ${company.localitate || ""} ${company.judet || ""}`.toLowerCase(),
          );
        const isLikelyMember = hasDirectSignal || hasIrrigationGeoContext;

        await db
          .update(silverCompanies)
          .set({
            metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{ouaiMembership}', ${JSON.stringify(
              {
                cui: job.data.cui,
                isLikelyMember,
                inferredFrom: {
                  apiaDataDetected: hasDirectSignal,
                  irrigationGeoContext: hasIrrigationGeoContext,
                  proximity,
                  geocoding,
                },
                checkedAt: new Date().toISOString(),
              },
            )}::jsonb)`,
            updatedAt: new Date(),
          })
          .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

        await db.insert(silverEnrichmentLog).values({
          tenantId: job.data.tenantId,
          entityType: "company",
          entityId: job.data.companyId,
          source: "ouai_membership",
          operation: "infer",
          requestPayload: { cui: job.data.cui },
          responsePayload: { isLikelyMember },
          fieldsUpdated: ["metadata"],
          correlationId: job.data.correlationId,
          jobId: String(job.id ?? ""),
          durationMs: Date.now() - startedAt,
        });

        log.step("done", "OUAI inferat", {
          latencyMs: Date.now() - startedAt,
          isMember: isLikelyMember,
        });
        return { ok: true, status: "success", isMember: isLikelyMember };
      } catch (error) {
        log.error(
          "fatal",
          `OUAI membership eșuat: ${error instanceof Error ? error.message : String(error)}`,
          {
            ...enrichError(error, {
              tenantId: job.data.tenantId,
              entityType: "company",
              entityId: job.data.companyId,
            }),
          },
        );
        throw error;
      }
    },
    { tenantId: job.data.tenantId },
  );
};
