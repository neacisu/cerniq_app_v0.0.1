import { db, silverCompanies, setSessionTenantId, sql } from "@cerniq/db";

export type BulkStatusResult = {
  total: number;
  activaCount: number;
  ratio: number;
  suspicious: boolean;
};

/**
 * Checks if all companies in Silver have status ACTIVA, which could indicate
 * a broken d1 worker that always defaults to ACTIVA instead of reading the
 * real stare_inregistrare from ANAF.
 *
 * Suspicious = ratio > 0.95 AND total >= 10.
 */
export async function checkBulkStatusFirmaActiva(tenantId: string): Promise<BulkStatusResult> {
  await setSessionTenantId(tenantId);

  const [stats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      activaCount: sql<number>`count(*) filter (where ${silverCompanies.statusFirma} = 'ACTIVA')::int`,
    })
    .from(silverCompanies)
    .where(sql`${silverCompanies.tenantId} = ${tenantId}`);

  const total = stats?.total ?? 0;
  const activaCount = stats?.activaCount ?? 0;
  const ratio = total > 0 ? activaCount / total : 0;
  const suspicious = total >= 10 && ratio > 0.95;

  return { total, activaCount, ratio, suspicious };
}

export type DuplicateCuiResult = {
  hasDuplicates: boolean;
  duplicates: Array<{ cui: string; count: number }>;
};

/**
 * Finds duplicate CUI values in Silver for a given tenant.
 * Duplicates indicate identity resolution failures or broken dedup logic.
 */
export async function checkDuplicateCuiSilver(tenantId: string): Promise<DuplicateCuiResult> {
  await setSessionTenantId(tenantId);

  const rows = await db
    .select({
      cui: silverCompanies.cui,
      count: sql<number>`count(*)::int`,
    })
    .from(silverCompanies)
    .where(sql`${silverCompanies.tenantId} = ${tenantId} AND ${silverCompanies.cui} IS NOT NULL`)
    .groupBy(silverCompanies.cui)
    .having(sql`count(*) > 1`)
    .limit(50);

  const duplicates = rows.flatMap((r) => (r.cui == null ? [] : [{ cui: r.cui, count: r.count }]));

  return {
    hasDuplicates: duplicates.length > 0,
    duplicates,
  };
}

export type StuckCompaniesResult = {
  hasStuck: boolean;
  stuckCompanies: Array<{
    id: string;
    cui: string | null;
    enrichmentStatus: string;
    lastEnrichedAt: Date | null;
  }>;
};

/**
 * Finds companies stuck in enrichment for longer than the given timeout.
 * Stuck means enrichmentStatus = 'in_progress' with no update for `timeoutMinutes`.
 */
export async function checkEnrichmentStuckCompanies(
  tenantId: string,
  timeoutMinutes = 60,
): Promise<StuckCompaniesResult> {
  await setSessionTenantId(tenantId);

  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);

  const rows = await db
    .select({
      id: silverCompanies.id,
      cui: silverCompanies.cui,
      enrichmentStatus: silverCompanies.enrichmentStatus,
      lastEnrichedAt: silverCompanies.lastEnrichedAt,
    })
    .from(silverCompanies)
    .where(
      sql`${silverCompanies.tenantId} = ${tenantId}
        AND ${silverCompanies.enrichmentStatus} = 'in_progress'
        AND (${silverCompanies.lastEnrichedAt} IS NULL OR ${silverCompanies.lastEnrichedAt} < ${cutoff})`,
    )
    .limit(100);

  const stuckCompanies = rows.map((r) => ({
    id: r.id,
    cui: r.cui,
    enrichmentStatus: r.enrichmentStatus,
    lastEnrichedAt: r.lastEnrichedAt,
  }));

  return {
    hasStuck: stuckCompanies.length > 0,
    stuckCompanies,
  };
}
