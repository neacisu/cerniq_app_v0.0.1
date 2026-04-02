/**
 * c17-geo-territory-calculate.ts — Worker C17: Geo Territory Calculate (Plan §X FAZA 9d)
 *
 * Queue: geo:territory:calculate (REDIS_DB_E5=5)
 * Trigger: post-cluster detection sau manual trigger
 *
 * SQL: SELECT ST_AsGeoJSON(ST_ConvexHull(ST_Collect(location::geometry))) FROM gold_companies
 * UPDATE gold_clusters SET territory_polygon, center_point = ST_Centroid, radius_km
 *
 * Anti-halucin. (A): GEOMETRY pentru ST_ConvexHull (operație geometrică, nu distanță)
 *                    GEOGRAPHY pentru distanțe (radius_km calculat din distanță în metri)
 */

import type { Job, Worker } from "bullmq";
import { db, eq, goldClusterMembers, sql } from "@cerniq/db";
import { QUEUES, createWorker, withCognitiveSpan } from "@cerniq/worker-shared";
import { getConvexHullForCluster } from "../lib/postgis-proximity.js";
import { e5PostgisQuerySeconds } from "../lib/e5-metrics.js";

export interface GeoTerritoryCalculateJobData {
  tenantId: string;
  clusterId: string;
  correlationId?: string;
}

export interface GeoTerritoryCalculateResult {
  ok: boolean;
  clusterId: string;
  geoJsonLength: number | null;
  radiusKm: number | null;
  memberCount: number;
}

export function createGeoTerritoryCalculateWorker(): Worker {
  const { worker } = createWorker<GeoTerritoryCalculateJobData>(
    QUEUES.E5_GEO_TERRITORY_CALCULATE,
    async (job: Job<GeoTerritoryCalculateJobData>): Promise<GeoTerritoryCalculateResult> => {
      return withCognitiveSpan("e5:geo:territory-calculate", async () => {
        const { tenantId, clusterId } = job.data;

        // 1. Fetch cluster members
        const members = await db
          .select({ clientId: goldClusterMembers.clientId })
          .from(goldClusterMembers)
          .where(eq(goldClusterMembers.clusterId, clusterId));

        if (members.length === 0) {
          job.log(`[C17] Cluster ${clusterId} has no members — skipping territory calculation`);
          return { ok: false, clusterId, geoJsonLength: null, radiusKm: null, memberCount: 0 };
        }

        const clientIds = members.map((m) => m.clientId);
        job.log(`[C17] Calculating territory for ${clientIds.length} cluster members`);

        // 2. ST_ConvexHull(ST_Collect(location::geometry)) via postgis-proximity wrapper
        const timer = e5PostgisQuerySeconds.startTimer({
          query_type: "convex_hull",
          tenant_id: tenantId,
        });
        const hull = await getConvexHullForCluster(clientIds);
        timer();

        if (!hull.geoJson) {
          job.log(`[C17] ConvexHull is NULL (members without location?) — partial update`);
          return {
            ok: false,
            clusterId,
            geoJsonLength: null,
            radiusKm: null,
            memberCount: clientIds.length,
          };
        }

        // Validare GeoJSON parsabil
        try {
          JSON.parse(hull.geoJson);
        } catch {
          throw new Error(
            `[C17] Invalid GeoJSON from ST_ConvexHull: ${hull.geoJson.slice(0, 100)}`,
          );
        }

        // 3. UPDATE gold_clusters cu territory_polygon (GEOMETRY), center_point (GEOGRAPHY), radius_km
        const radiusKmRounded =
          hull.radiusKm === null ? null : Math.round(hull.radiusKm * 100) / 100;

        await db.execute(sql`
          UPDATE gold.gold_clusters
          SET
            territory_polygon = ST_GeomFromGeoJSON(${hull.geoJson}),
            center_point = CASE
              WHEN ${hull.centroidLon} IS NOT NULL AND ${hull.centroidLat} IS NOT NULL
              THEN ST_SetSRID(ST_MakePoint(${hull.centroidLon}, ${hull.centroidLat}), 4326)::geography
              ELSE NULL
            END,
            radius_km = ${radiusKmRounded},
            member_count = ${clientIds.length},
            updated_at = NOW()
          WHERE id = ${clusterId}::uuid
            AND tenant_id = ${tenantId}::uuid
        `);

        job.log(
          `[C17] Territory updated: cluster=${clusterId}, ` +
            `members=${clientIds.length}, radiusKm=${radiusKmRounded}`,
        );

        return {
          ok: true,
          clusterId,
          geoJsonLength: hull.geoJson.length,
          radiusKm: radiusKmRounded,
          memberCount: clientIds.length,
        };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 5,
    },
  );

  return worker;
}
