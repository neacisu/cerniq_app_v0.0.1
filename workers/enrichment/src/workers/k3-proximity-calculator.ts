import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";

export type ProximityJobData = {
  tenantId: string;
  companyId: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
  correlationId?: string;
};

const DEFAULT_RADIUS_KM = 50;
const MAX_NEARBY = 100;

export const proximityCalculatorProcessor: Processor<ProximityJobData> = async (job) => {
  const startedAt = Date.now();
  const { tenantId, companyId, latitude, longitude } = job.data;
  const radiusKm = job.data.radiusKm ?? DEFAULT_RADIUS_KM;
  await setSessionTenantId(tenantId);

  const nearbyRows = await db.execute<{
    id: string;
    distance_km: number;
    is_agricultural: boolean;
  }>(sql`
    SELECT
      sc.id,
      (
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${latitude})) * cos(radians(CAST(sc.latitude AS double precision)))
            * cos(radians(CAST(sc.longitude AS double precision)) - radians(${longitude}))
            + sin(radians(${latitude})) * sin(radians(CAST(sc.latitude AS double precision)))
          ))
        )
      ) AS distance_km,
      COALESCE((sc.metadata->>'isAgricultural')::boolean, false) AS is_agricultural
    FROM silver.silver_companies sc
    WHERE sc.tenant_id = ${tenantId}
      AND sc.id != ${companyId}
      AND sc.latitude IS NOT NULL
      AND sc.longitude IS NOT NULL
      AND (
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${latitude})) * cos(radians(CAST(sc.latitude AS double precision)))
            * cos(radians(CAST(sc.longitude AS double precision)) - radians(${longitude}))
            + sin(radians(${latitude})) * sin(radians(CAST(sc.latitude AS double precision)))
          ))
        )
      ) <= ${radiusKm}
    ORDER BY distance_km ASC
    LIMIT ${MAX_NEARBY}
  `);

  const nearby = Array.isArray(nearbyRows) ? nearbyRows : [];
  const nearbyAgri = nearby.filter((r: { is_agricultural: boolean }) => r.is_agricultural);

  const proximityData = {
    nearbyCompaniesCount: nearby.length,
    nearbyAgriculturalCount: nearbyAgri.length,
    nearestCompanyId: nearby[0]?.id ?? null,
    nearestDistanceKm: nearby[0] ? Math.round(nearby[0].distance_km * 100) / 100 : null,
    radiusKm,
    calculatedAt: new Date().toISOString(),
  };

  await db
    .update(silverCompanies)
    .set({
      metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{proximity}', ${JSON.stringify(proximityData)}::jsonb)`,
      updatedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${companyId}`);

  await db.insert(silverEnrichmentLog).values({
    tenantId,
    entityType: "company",
    entityId: companyId,
    source: "proximity_calculator",
    operation: "calculate",
    requestPayload: { latitude, longitude, radiusKm },
    responsePayload: proximityData,
    fieldsUpdated: ["metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return {
    ok: true,
    status: "success",
    nearbyCompanies: nearby.length,
    nearbyAgricultural: nearbyAgri.length,
    nearestDistanceKm: proximityData.nearestDistanceKm,
  };
};
