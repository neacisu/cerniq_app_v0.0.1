/**
 * c19-geo-catchment-build.ts — Worker C19: Geo Catchment Build (Plan §X FAZA 9d)
 *
 * Queue: geo:catchment:build (REDIS_DB_E5=5)
 * Trigger: post-proximity batch, sau manual
 *
 * Logică (Voronoi-like zones):
 * - Input: set anchorClientIds (clienți existenți cu locationGeography) + prospectClientIds
 * - Per fiecare prospect: găsește cel mai aproape anchor (KNN <-> ORDER BY)
 * - Output: zone map { prospectId → nearestAnchorId, distanceMeters }
 * - UPDATE gold_proximity_scores.metadata cu catchment zone info
 *
 * Anti-halucin. (D): ORDER BY location <-> anchor (KNN) pentru nearest anchor assignment
 */

import type { Job, Worker } from "bullmq";
import { db, eq, and, goldProximityScores, sql } from "@cerniq/db";
import { QUEUES, createWorker, withCognitiveSpan } from "@cerniq/worker-shared";
import { buildCatchmentZones } from "../lib/postgis-proximity.js";
import { e5PostgisQuerySeconds } from "../lib/e5-metrics.js";

export interface GeoCatchmentBuildJobData {
  tenantId: string;
  anchorClientIds: string[];
  prospectClientIds: string[];
  correlationId?: string;
}

export interface CatchmentZoneResult {
  prospectClientId: string;
  nearestAnchorId: string;
  distanceMeters: number;
}

export interface GeoCatchmentBuildResult {
  ok: boolean;
  assignedCount: number;
  unassignedCount: number;
  zones: CatchmentZoneResult[];
  durationMs: number;
}

export function createGeoCatchmentBuildWorker(): Worker {
  const { worker } = createWorker<GeoCatchmentBuildJobData>(
    QUEUES.E5_GEO_CATCHMENT_BUILD,
    async (job: Job<GeoCatchmentBuildJobData>): Promise<GeoCatchmentBuildResult> => {
      return withCognitiveSpan("e5:geo:catchment-build", async () => {
        const startedAt = Date.now();
        const { tenantId, anchorClientIds, prospectClientIds } = job.data;

        if (anchorClientIds.length === 0) {
          job.log("[C19] No anchor clients provided — skipping");
          return {
            ok: false,
            assignedCount: 0,
            unassignedCount: prospectClientIds.length,
            zones: [],
            durationMs: 0,
          };
        }

        job.log(
          `[C19] Building catchment zones: ${anchorClientIds.length} anchors, ${prospectClientIds.length} prospects`,
        );

        // KNN nearest-anchor assignment per prospect
        const timer = e5PostgisQuerySeconds.startTimer({
          query_type: "catchment_build",
          tenant_id: tenantId,
        });
        const assignments = await buildCatchmentZones({
          tenantId,
          anchorClientIds,
          prospectClientIds,
        });
        timer();

        const assignedIds = new Set(assignments.map((a) => a.prospectClientId));
        const unassignedCount = prospectClientIds.filter((id) => !assignedIds.has(id)).length;

        // UPDATE gold_proximity_scores.metadata cu zona catchment
        for (const assignment of assignments) {
          await db
            .update(goldProximityScores)
            .set({
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(goldProximityScores.tenantId, tenantId),
                eq(goldProximityScores.anchorId, assignment.nearestAnchorId),
                eq(goldProximityScores.prospectId, assignment.prospectClientId),
              ),
            );
          // Store catchment zone in metadata via raw SQL (metadata column added in 0054)
          await db.execute(sql`
            UPDATE gold.gold_proximity_scores
            SET metadata = jsonb_set(
              COALESCE(metadata, '{}'),
              '{catchmentZone}',
              ${JSON.stringify({
                nearestAnchorId: assignment.nearestAnchorId,
                distanceMeters: assignment.distanceMeters,
                assignedAt: new Date().toISOString(),
              })}::jsonb
            ),
            updated_at = NOW()
            WHERE tenant_id = ${tenantId}::uuid
              AND anchor_id = ${assignment.nearestAnchorId}::uuid
              AND prospect_id = ${assignment.prospectClientId}::uuid
          `);
        }

        const durationMs = Date.now() - startedAt;
        job.log(
          `[C19] Catchment built: ${assignments.length} assigned, ${unassignedCount} unassigned, ${durationMs}ms`,
        );

        return {
          ok: true,
          assignedCount: assignments.length,
          unassignedCount,
          zones: assignments.map((a) => ({
            prospectClientId: a.prospectClientId,
            nearestAnchorId: a.nearestAnchorId,
            distanceMeters: a.distanceMeters,
          })),
          durationMs,
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
