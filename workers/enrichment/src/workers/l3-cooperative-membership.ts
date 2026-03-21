import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";

export type CooperativeMembershipJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

export const cooperativeMembershipProcessor: Processor<CooperativeMembershipJobData> = async (
  job,
) => {
  const startedAt = Date.now();
  await setSessionTenantId(job.data.tenantId);
  const company = await db.query.silverCompanies.findFirst({
    where: (t, { and, eq }) => and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
  });
  if (!company) return { ok: false, status: "not_found" };

  const metadata = (company.metadata as Record<string, unknown>) ?? {};
  const apiaData = metadata.apiaData as Record<string, unknown> | undefined;
  const apiaPayloadText = JSON.stringify(apiaData?.payload ?? {}).toLowerCase();

  let domain: string | null = null;
  if (company.website) {
    try {
      domain = new URL(
        company.website.startsWith("http") ? company.website : `https://${company.website}`,
      ).hostname;
    } catch {
      domain = company.website.toLowerCase();
    }
  }

  const directCoopSignals = [
    /\bcooperativ[aă]\b/i,
    /\bmembru cooperativ/i,
    /\bassociat cooperativ/i,
    /\bgrup de producatori/i,
    /\buniune de cooperative/i,
  ];
  const hasApiaCoopSignal = directCoopSignals.some((rx) => rx.test(apiaPayloadText));
  const hasNameOrDomainSignal = /(cooperativ|co-op|agrocoop|grupproducatori)/i.test(
    `${company.denumire ?? ""} ${domain ?? ""}`.toLowerCase(),
  );
  const coopHint = hasApiaCoopSignal || hasNameOrDomainSignal;

  await db
    .update(silverCompanies)
    .set({
      metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{cooperativeMembership}', ${JSON.stringify(
        {
          cui: job.data.cui,
          inferred: coopHint,
          inferredFrom: {
            apiaSignal: hasApiaCoopSignal,
            nameDomainSignal: hasNameOrDomainSignal,
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
    source: "cooperative_membership",
    operation: "infer",
    requestPayload: { cui: job.data.cui },
    responsePayload: { inferred: coopHint },
    fieldsUpdated: ["metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return { ok: true, status: "success", isMember: coopHint };
};
