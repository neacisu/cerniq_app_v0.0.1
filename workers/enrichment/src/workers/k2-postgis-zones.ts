import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { createQueue, withCognitiveSpan } from "@cerniq/worker-shared";
import { createServiceLogger, enrichError } from "@cerniq/observability";

const svcLog = createServiceLogger("k2-postgis-zones", { etapa: "e1" });

export type PostgisZonesJobData = {
  tenantId: string;
  companyId: string;
  latitude: number;
  longitude: number;
  correlationId?: string;
};

const COUNTY_CODE_MAP: Record<string, string> = {
  alba: "AB",
  arad: "AR",
  arges: "AG",
  bacau: "BC",
  bihor: "BH",
  "bistrita-nasaud": "BN",
  botosani: "BT",
  brasov: "BV",
  braila: "BR",
  buzau: "BZ",
  "caras-severin": "CS",
  calarasi: "CL",
  cluj: "CJ",
  constanta: "CT",
  covasna: "CV",
  dambovita: "DB",
  dolj: "DJ",
  galati: "GL",
  giurgiu: "GR",
  gorj: "GJ",
  harghita: "HR",
  hunedoara: "HD",
  ialomita: "IL",
  iasi: "IS",
  ilfov: "IF",
  maramures: "MM",
  mehedinti: "MH",
  mures: "MS",
  neamt: "NT",
  olt: "OT",
  prahova: "PH",
  "satu mare": "SM",
  salaj: "SJ",
  sibiu: "SB",
  suceava: "SV",
  teleorman: "TR",
  timis: "TM",
  tulcea: "TL",
  vaslui: "VS",
  valcea: "VL",
  vrancea: "VN",
  bucuresti: "B",
};

function resolveCountyCode(judet: string | null): string | null {
  if (!judet) return null;
  const normalized = judet
    .toLowerCase()
    .replaceAll(/[^a-z\s-]/g, "")
    .trim();
  if (COUNTY_CODE_MAP[normalized]) return COUNTY_CODE_MAP[normalized];
  for (const [name, code] of Object.entries(COUNTY_CODE_MAP)) {
    if (normalized.includes(name) || name.includes(normalized)) return code;
  }
  if (normalized.length === 2) return normalized.toUpperCase();
  return null;
}

export const postgisZonesProcessor: Processor<PostgisZonesJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:geo:zones-postgis",
    async (_span) => {
      const startedAt = Date.now();
      const { tenantId, companyId, latitude, longitude } = job.data;
      await setSessionTenantId(tenantId);

      const company = await db.query.silverCompanies.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, companyId)),
      });
      if (!company) return { ok: false, status: "not_found" };

      const judetCod = resolveCountyCode(company.judet);

      let nearestCityName: string | null = null;
      let nearestCityDistanceKm: number | null = null;
      const isRuralArea = company.localitate
        ? !/municipiu|oras|oraș/i.test(company.localitate)
        : null;

      try {
        const nearestCityRows = await db.execute<{
          id: string;
          denumire: string | null;
          distance_km: number;
        }>(sql`
      SELECT
        sc.id,
        sc.denumire,
        (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(${latitude})) * cos(radians(CAST(sc.latitude AS double precision)))
              * cos(radians(CAST(sc.longitude AS double precision)) - radians(${longitude}))
              + sin(radians(${latitude})) * sin(radians(CAST(sc.latitude AS double precision)))
            ))
          )
        ) AS distance_km
      FROM silver.silver_companies sc
      WHERE sc.tenant_id = ${tenantId}
        AND sc.id != ${companyId}
        AND sc.latitude IS NOT NULL
        AND sc.longitude IS NOT NULL
        AND sc.localitate IS NOT NULL
        AND (sc.localitate ILIKE '%municipiu%' OR sc.localitate ILIKE '%oras%' OR sc.localitate ILIKE '%oraș%')
      ORDER BY distance_km ASC
      LIMIT 1
    `);

        const cityArr = Array.isArray(nearestCityRows) ? nearestCityRows : [];
        if (cityArr.length > 0) {
          nearestCityName = cityArr[0].denumire;
          nearestCityDistanceKm = Math.round(Number(cityArr[0].distance_km) * 100) / 100;
        }
      } catch (err) {
        const enr = enrichError(err, {
          tenantId,
          companyId,
          query: "nearest_city_postgis",
        });
        svcLog.error(
          {
            err,
            ...enr,
            tenantId,
            companyId,
            latitude,
            longitude,
            query: "nearest_city_postgis",
            postgisVersion: process.env.POSTGIS_VERSION ?? "unknown",
            errorMessage: err instanceof Error ? err.message : String(err),
          },
          "Nearest-city PostGIS query failed; continuing with partial zone data",
        );
      }

      const zoneData = {
        latitude,
        longitude,
        judetCod,
        comunaCod: null as string | null,
        nearestCityName,
        nearestCityDistanceKm,
        isRuralArea,
        calculatedAt: new Date().toISOString(),
      };

      await db
        .update(silverCompanies)
        .set({
          judetCod: judetCod ?? undefined,
          metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{postgisZones}', ${JSON.stringify(zoneData)}::jsonb)`,
          updatedAt: new Date(),
        })
        .where(sql`${silverCompanies.id} = ${companyId}`);

      const proximityQueue = createQueue("geo:proximity");
      await proximityQueue.add("proximity", {
        tenantId,
        companyId,
        latitude,
        longitude,
        correlationId: job.data.correlationId,
      });
      await proximityQueue.close();

      await db.insert(silverEnrichmentLog).values({
        tenantId,
        entityType: "company",
        entityId: companyId,
        source: "postgis_zones",
        operation: "calculate",
        requestPayload: { latitude, longitude },
        responsePayload: zoneData,
        fieldsUpdated: ["judetCod", "metadata"],
        correlationId: job.data.correlationId,
        jobId: String(job.id ?? ""),
        durationMs: Date.now() - startedAt,
      });

      return { ok: true, status: "success", judetCod, nearestCityName, nearestCityDistanceKm };
    },
    { tenantId: job.data.tenantId },
  );
};
