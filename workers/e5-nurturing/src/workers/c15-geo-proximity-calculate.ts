/**
 * c15-geo-proximity-calculate.ts — Worker C15: Geo Proximity Calculate (Plan §X FAZA 9d)
 *
 * Queue: geo:proximity:calculate (REDIS_DB_E5=5)
 * Trigger: direct enqueue, cron weekly batch, sau după E1 geocoding
 *
 * Anti-halucin. FAZA 9d:
 *   (A) GEOGRAPHY type — distanțe în METRI
 *   (D) KNN <-> operator — NU ORDER BY ST_Distance
 *   (E) Formula EXACTĂ: proximityScore = distanceScore×0.5 + anchorQuality×0.3 + sharedBonus×0.2
 *   (F) Refolosește gold_companies.location_geography — fără geocoding pipeline nou
 *
 * Schema reală: goldProximityScores.anchorId, goldProximityScores.prospectId
 * (din gold-e5-referrals.ts — tabel creat în 0051_e5_referrals.sql)
 */

import type { Job, Worker } from "bullmq";
import { db, goldProximityScores, sql } from "@cerniq/db";
import { QUEUES, createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";
import {
  findNearbyClients,
  fetchAnchorData,
  calcDistanceScore,
  calcAnchorQuality,
  calcSharedBonus,
  calcProximityScore,
  hasCropOverlap,
  validatePostGISExtension,
  DEFAULT_RADIUS_METERS,
  NEIGHBOR_THRESHOLD,
} from "../lib/postgis-proximity.js";
import { e5PostgisQuerySeconds } from "../lib/e5-metrics.js";

export interface GeoProximityCalculateJobData {
  tenantId: string;
  anchorClientId: string;
  radiusMeters?: number;
  correlationId?: string;
}

export interface GeoProximityCalculateResult {
  ok: boolean;
  nearbyCount: number;
  upsertedCount: number;
  neighborCandidates: number;
  durationMs: number;
}

export function createGeoProximityCalculateWorker(): Worker {
  const neighborQueue = createQueue(QUEUES.E5_GEO_NEIGHBOR_IDENTIFY, { db: 5 });

  const { worker } = createWorker<GeoProximityCalculateJobData>(
    QUEUES.E5_GEO_PROXIMITY_CALCULATE,
    async (job: Job<GeoProximityCalculateJobData>): Promise<GeoProximityCalculateResult> => {
      return withCognitiveSpan("e5:geo:proximity-calculate", async () => {
        const startedAt = Date.now();
        const { tenantId, anchorClientId } = job.data;
        const radiusMeters = job.data.radiusMeters ?? DEFAULT_RADIUS_METERS;

        // 1. Validare PostGIS extension
        await validatePostGISExtension();

        // 2. Fetch anchor data
        const anchor = await fetchAnchorData(anchorClientId);
        if (!anchor) {
          job.log(`[C15] Anchor ${anchorClientId} not found — skipping`);
          return {
            ok: false,
            nearbyCount: 0,
            upsertedCount: 0,
            neighborCandidates: 0,
            durationMs: 0,
          };
        }

        const anchorQuality = calcAnchorQuality(
          anchor.cifraAfaceri === null ? null : Number(anchor.cifraAfaceri),
        );

        // 3. KNN proximity query (ST_DWithin + ORDER BY <->)
        const queryTimer = e5PostgisQuerySeconds.startTimer({
          query_type: "st_dwithin_knn",
          tenant_id: tenantId,
        });
        const nearbyClients = await findNearbyClients({
          tenantId,
          anchorClientId,
          radiusMeters,
        });
        queryTimer();

        job.log(`[C15] Found ${nearbyClients.length} nearby clients within ${radiusMeters}m`);

        // 4. Calculează proximityScore per prospect + UPSERT
        const neighborCandidates: string[] = [];
        let upsertedCount = 0;

        for (const prospect of nearbyClients) {
          const sameCounty =
            anchor.judetCod !== null &&
            prospect.judetCod !== null &&
            anchor.judetCod === prospect.judetCod;
          const sameCrop = hasCropOverlap(anchor.culturiPrincipale, prospect.culturiPrincipale);

          const distanceScore = calcDistanceScore(prospect.distanceMeters, radiusMeters);
          const sharedBonus = calcSharedBonus(sameCounty, sameCrop);
          const proximityScore = calcProximityScore(distanceScore, anchorQuality, sharedBonus);

          const distMetersRounded = String(Math.round(prospect.distanceMeters * 10) / 10);
          const proxScoreStr = String(Math.round(proximityScore * 10000) / 10000);
          const distScoreStr = String(Math.round(distanceScore * 10000) / 10000);
          const anchorQualStr = String(Math.round(anchorQuality * 10000) / 10000);
          const sharedBonusStr = String(Math.round(sharedBonus * 10000) / 10000);

          // UPSERT gold_proximity_scores (schema: anchorId, prospectId)
          await db
            .insert(goldProximityScores)
            .values({
              tenantId,
              anchorId: anchorClientId,
              prospectId: prospect.id,
              distanceMeters: distMetersRounded,
              proximityScore: proxScoreStr,
              distanceScore: distScoreStr,
              anchorQuality: anchorQualStr,
              sharedBonus: sharedBonusStr,
              radiusMeters,
              sameCounty,
              sameCrop,
              calculatedAt: new Date(),
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [
                goldProximityScores.tenantId,
                goldProximityScores.anchorId,
                goldProximityScores.prospectId,
              ],
              set: {
                distanceMeters: sql`EXCLUDED.distance_meters`,
                proximityScore: sql`EXCLUDED.proximity_score`,
                distanceScore: sql`EXCLUDED.distance_score`,
                anchorQuality: sql`EXCLUDED.anchor_quality`,
                sharedBonus: sql`EXCLUDED.shared_bonus`,
                radiusMeters: sql`EXCLUDED.radius_meters`,
                sameCounty: sql`EXCLUDED.same_county`,
                sameCrop: sql`EXCLUDED.same_crop`,
                calculatedAt: sql`EXCLUDED.calculated_at`,
                updatedAt: sql`NOW()`,
              },
            });

          upsertedCount++;

          // 5. Enqueue C16 pentru top prospects (score >= threshold)
          if (proximityScore >= NEIGHBOR_THRESHOLD) {
            neighborCandidates.push(prospect.id);
          }
        }

        // Batch enqueue C16
        if (neighborCandidates.length > 0) {
          await neighborQueue.addBulk(
            neighborCandidates.map((prospectId) => ({
              name: "neighbor",
              data: {
                tenantId,
                anchorClientId,
                prospectClientId: prospectId,
                correlationId: job.data.correlationId,
              },
            })),
          );
        }

        const durationMs = Date.now() - startedAt;
        job.log(
          `[C15] Done: ${upsertedCount} upserted, ${neighborCandidates.length} neighbor candidates, ${durationMs}ms`,
        );

        return {
          ok: true,
          nearbyCount: nearbyClients.length,
          upsertedCount,
          neighborCandidates: neighborCandidates.length,
          durationMs,
        };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 10,
    },
  );

  return worker;
}
