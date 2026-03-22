import { db, silverCompanies, sql } from "@cerniq/db";
import { createQueue, QUEUES } from "@cerniq/worker-shared";

export const REQUIRED_ENRICHMENT_SOURCES = [
  "anaf_fiscal",
  "anaf_tva",
  "anaf_efactura",
  "anaf_datorii",
  "anaf_caen",
  "termene_balance",
  "termene_risk",
  "termene_dosare",
  "termene_actionari",
  "onrc_data",
  "onrc_administratori",
  "onrc_sedii",
] as const;

export async function markEnrichmentSourceComplete(
  tenantId: string,
  companyId: string,
  source: (typeof REQUIRED_ENRICHMENT_SOURCES)[number],
  correlationId?: string,
): Promise<{ allComplete: boolean; completedSources: string[] }> {
  // Pre-check: if source was already completed, skip update and queue.add entirely
  const [current] = await db
    .select({ sources: silverCompanies.enrichmentSourcesCompleted })
    .from(silverCompanies)
    .where(sql`${silverCompanies.tenantId} = ${tenantId} AND ${silverCompanies.id} = ${companyId}`)
    .limit(1);

  const existingSources = Array.isArray(current?.sources) ? (current.sources as string[]) : [];
  if (existingSources.includes(source)) {
    const allComplete = REQUIRED_ENRICHMENT_SOURCES.every((item) => existingSources.includes(item));
    return { allComplete, completedSources: existingSources };
  }

  const [updated] = await db
    .update(silverCompanies)
    .set({
      enrichmentSourcesCompleted: sql`
        CASE
          WHEN NOT (COALESCE(${silverCompanies.enrichmentSourcesCompleted}, '[]'::jsonb) @> ${JSON.stringify([source])}::jsonb)
          THEN COALESCE(${silverCompanies.enrichmentSourcesCompleted}, '[]'::jsonb) || ${JSON.stringify([source])}::jsonb
          ELSE COALESCE(${silverCompanies.enrichmentSourcesCompleted}, '[]'::jsonb)
        END
      `,
      lastEnrichedAt: new Date(),
    })
    .where(sql`${silverCompanies.tenantId} = ${tenantId} AND ${silverCompanies.id} = ${companyId}`)
    .returning({ sources: silverCompanies.enrichmentSourcesCompleted });

  const completedSources = Array.isArray(updated?.sources) ? (updated.sources as string[]) : [];
  const allComplete = REQUIRED_ENRICHMENT_SOURCES.every((item) => completedSources.includes(item));

  if (allComplete) {
    const queue = createQueue(QUEUES.PIPELINE_ORCHESTRATE);
    await queue.add(
      "post-enrichment",
      {
        tenantId,
        companyId,
        stage: "post_enrichment",
        correlationId,
      },
      {
        jobId: `post-enrich-${companyId}`,
      },
    );
    await queue.close();
  }

  return { allComplete, completedSources };
}
