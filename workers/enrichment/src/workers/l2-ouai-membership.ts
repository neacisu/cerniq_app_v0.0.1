import type { Processor } from "bullmq";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";

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
      await setSessionTenantId(job.data.tenantId);
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

      return { ok: true, status: "success", isMember: isLikelyMember };
    },
    { tenantId: job.data.tenantId },
  );
};
