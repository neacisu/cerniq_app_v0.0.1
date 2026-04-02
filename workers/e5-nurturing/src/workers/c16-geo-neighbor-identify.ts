/**
 * c16-geo-neighbor-identify.ts — Worker C16: Geo Neighbor Identify (Plan §X FAZA 9d)
 *
 * Queue: geo:neighbor:identify (REDIS_DB_E5=5)
 * Trigger: C15 (pentru fiecare prospect cu score >= 0.6)
 *
 * Schema reală:
 *   goldEntityRelationships: entityAId, entityBId, relationType, distanceMeters,
 *                            bidirectional, confidence, source, metadata
 *   goldNurturingState: leadId, neighborCount
 *
 * Logică:
 * 1. Dacă proximityScore >= 0.6 → INSERT gold_entity_relationships cu relationType='NEIGHBOR'
 * 2. Verifică dacă relația inversă există → update bidirectional=true pe ambele
 * 3. UPDATE gold_nurturing_state.neighborCount (COUNT of NEIGHBOR relationships)
 */

import type { Job, Worker } from "bullmq";
import {
  db,
  eq,
  and,
  goldEntityRelationships,
  goldNurturingState,
  goldProximityScores,
  sql,
} from "@cerniq/db";
import { QUEUES, createWorker, withCognitiveSpan } from "@cerniq/worker-shared";
import { NEIGHBOR_THRESHOLD } from "../lib/postgis-proximity.js";
import { e5PostgisQuerySeconds } from "../lib/e5-metrics.js";

export interface GeoNeighborIdentifyJobData {
  tenantId: string;
  anchorClientId: string;
  prospectClientId: string;
  correlationId?: string;
}

export interface GeoNeighborIdentifyResult {
  ok: boolean;
  neighborInserted: boolean;
  isBidirectional: boolean;
  neighborCountUpdated: boolean;
}

export function createGeoNeighborIdentifyWorker(): Worker {
  const { worker } = createWorker<GeoNeighborIdentifyJobData>(
    QUEUES.E5_GEO_NEIGHBOR_IDENTIFY,
    async (job: Job<GeoNeighborIdentifyJobData>): Promise<GeoNeighborIdentifyResult> => {
      return withCognitiveSpan("e5:geo:neighbor-identify", async () => {
        const { tenantId, anchorClientId, prospectClientId } = job.data;

        // 1. Fetch proximityScore din gold_proximity_scores
        const [scoreRow] = await db
          .select({
            proximityScore: goldProximityScores.proximityScore,
            distanceMeters: goldProximityScores.distanceMeters,
          })
          .from(goldProximityScores)
          .where(
            and(
              eq(goldProximityScores.tenantId, tenantId),
              eq(goldProximityScores.anchorId, anchorClientId),
              eq(goldProximityScores.prospectId, prospectClientId),
            ),
          )
          .limit(1);

        const proximityScore = scoreRow ? Number(scoreRow.proximityScore) : 0;
        const distanceMeters = scoreRow ? scoreRow.distanceMeters : null;

        if (proximityScore < NEIGHBOR_THRESHOLD) {
          job.log(
            `[C16] proximityScore ${proximityScore} < ${NEIGHBOR_THRESHOLD} — not a neighbor, skipping`,
          );
          return {
            ok: true,
            neighborInserted: false,
            isBidirectional: false,
            neighborCountUpdated: false,
          };
        }

        // 2. UPSERT gold_entity_relationships (anchor → prospect)
        const timer = e5PostgisQuerySeconds.startTimer({
          query_type: "neighbor_identify",
          tenant_id: tenantId,
        });

        const confidenceStr = String(Math.round(proximityScore * 10000) / 10000);

        await db
          .insert(goldEntityRelationships)
          .values({
            tenantId,
            entityAId: anchorClientId,
            entityBId: prospectClientId,
            relationType: "NEIGHBOR",
            distanceMeters: distanceMeters ?? undefined,
            bidirectional: false,
            confidence: confidenceStr,
            source: "geo:proximity:calculate",
            metadata: {},
          })
          .onConflictDoUpdate({
            target: [
              goldEntityRelationships.tenantId,
              goldEntityRelationships.entityAId,
              goldEntityRelationships.entityBId,
              goldEntityRelationships.relationType,
            ],
            set: {
              confidence: sql`EXCLUDED.confidence`,
              distanceMeters: sql`EXCLUDED.distance_meters`,
              updatedAt: sql`NOW()`,
            },
          });

        // 3. Verifică relația inversă (prospect → anchor)
        const [reverseRow] = await db
          .select({ id: goldEntityRelationships.id })
          .from(goldEntityRelationships)
          .where(
            and(
              eq(goldEntityRelationships.tenantId, tenantId),
              eq(goldEntityRelationships.entityAId, prospectClientId),
              eq(goldEntityRelationships.entityBId, anchorClientId),
              sql`${goldEntityRelationships.relationType} = 'NEIGHBOR'`,
            ),
          )
          .limit(1);

        let isBidirectional = false;
        if (reverseRow) {
          isBidirectional = true;
          // Marchează ambele direcții ca bidirectional
          await db.execute(sql`
            UPDATE gold.gold_entity_relationships
            SET bidirectional = TRUE, updated_at = NOW()
            WHERE tenant_id = ${tenantId}::uuid
              AND relation_type = 'NEIGHBOR'
              AND (
                (entity_a_id = ${anchorClientId}::uuid AND entity_b_id = ${prospectClientId}::uuid)
                OR
                (entity_a_id = ${prospectClientId}::uuid AND entity_b_id = ${anchorClientId}::uuid)
              )
          `);
        }

        timer();

        // 4. UPDATE gold_nurturing_state.neighborCount pentru anchor
        const [countRow] = await db.execute<{ neighbor_count: string }>(sql`
          SELECT COUNT(*)::integer AS neighbor_count
          FROM gold.gold_entity_relationships
          WHERE tenant_id = ${tenantId}::uuid
            AND entity_a_id = ${anchorClientId}::uuid
            AND relation_type = 'NEIGHBOR'
        `);

        const neighborCount = countRow ? Number(countRow.neighbor_count) : 0;

        await db
          .update(goldNurturingState)
          .set({ neighborCount, updatedAt: new Date() })
          .where(
            and(
              eq(goldNurturingState.tenantId, tenantId),
              eq(goldNurturingState.leadId, anchorClientId),
            ),
          );

        job.log(
          `[C16] NEIGHBOR: ${anchorClientId} → ${prospectClientId}, ` +
            `confidence=${confidenceStr}, bidirectional=${isBidirectional}, neighborCount=${neighborCount}`,
        );

        return {
          ok: true,
          neighborInserted: true,
          isBidirectional,
          neighborCountUpdated: true,
        };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 20,
    },
  );

  return worker;
}
