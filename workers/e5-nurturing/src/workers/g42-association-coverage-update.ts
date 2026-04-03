/**
 * g42-association-coverage-update.ts — Worker G42: Association Coverage Polygon Update (Plan §X FAZA 9g)
 *
 * Queue: association:coverage:update (REDIS_DB_E5=5)
 * Timeout: 120s
 * Concurrency: 3
 *
 * Responsabilitate:
 *   - Calculează coverage polygon ConvexHull din locațiile membrilor asociației
 *   - Folosește ST_ConvexHull(ST_Collect(ST_Transform(...))) via PostGIS raw SQL
 *   - Guard: minimum 3 puncte pentru ConvexHull valid
 *   - Actualizează sau inserează goldClusters cu detectionMethod='MANUAL'
 *
 * Anti-halucin. FAZA 9g:
 *   (A) geometryPolygon = GEOMETRY(POLYGON,4326), geographyPoint = GEOGRAPHY(POINT,4326)
 *   (B) ST_Transform(geography::geometry, 4326) — convertire corectă
 *   (C) Minimum 3 puncte pentru ConvexHull valid
 *   (D) Timeout 120s — operație DB + PostGIS, nu Python subprocess
 */

import type { Job, Worker } from "bullmq";
import { db, goldAssociations, goldClusters, eq, and, setSessionTenantId, sql } from "@cerniq/db";
import { QUEUES, createWorker, withCognitiveSpan } from "@cerniq/worker-shared";

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface AssociationCoverageUpdateJobData {
  tenantId: string;
  associationId: string;
  correlationId?: string;
}

export interface AssociationCoverageUpdateResult {
  ok: boolean;
  associationId: string;
  polygonUpdated: boolean;
  memberLocationsUsed: number;
  clusterUpdated: boolean;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createAssociationCoverageUpdateWorker(): Worker {
  const { worker } = createWorker<AssociationCoverageUpdateJobData>(
    QUEUES.E5_ASSOCIATION_COVERAGE_UPDATE,
    async (
      job: Job<AssociationCoverageUpdateJobData>,
    ): Promise<AssociationCoverageUpdateResult> => {
      return withCognitiveSpan("e5:association:coverage-update", async () => {
        const { tenantId, associationId } = job.data;

        job.log(
          `[G42] Starting coverage update for association=${associationId}, tenant=${tenantId}`,
        );

        // ── 1. Set RLS tenant session ──────────────────────────────────────
        await setSessionTenantId(tenantId);

        // ── 2. Verificare existență asociație ──────────────────────────────
        const [association] = await db
          .select({
            id: goldAssociations.id,
            name: goldAssociations.name,
          })
          .from(goldAssociations)
          .where(
            and(eq(goldAssociations.id, associationId), eq(goldAssociations.tenantId, tenantId)),
          )
          .limit(1);

        if (!association) {
          job.log(`[G42] Association ${associationId} not found for tenant ${tenantId}`);
          return {
            ok: false,
            associationId,
            polygonUpdated: false,
            memberLocationsUsed: 0,
            clusterUpdated: false,
          };
        }

        // ── 3. Count member locations disponibile ──────────────────────────
        const countResult = await db.execute<{ count: string }>(sql`
          SELECT COUNT(*)::text AS count
          FROM gold.gold_affiliations a
          JOIN gold.gold_companies c ON c.id = a.client_id
          WHERE a.association_id = ${associationId}
            AND c.location_geography IS NOT NULL
            AND a.is_current = true
        `);

        const memberCount = Number.parseInt(
          (countResult[0] as { count: string } | undefined)?.count ?? "0",
          10,
        );

        job.log(`[G42] Member locations with geography: ${memberCount}`);

        // ── 4. GUARD: minimum 3 puncte pentru ConvexHull valid ────────────
        if (memberCount < 3) {
          job.log(
            `[G42] Insufficient member locations (${memberCount} < 3) — skipping polygon update`,
          );
          return {
            ok: true,
            associationId,
            polygonUpdated: false,
            memberLocationsUsed: memberCount,
            clusterUpdated: false,
          };
        }

        // ── 5. PostGIS UPDATE coverage_polygon via ConvexHull ─────────────
        await db.execute(sql`
          UPDATE gold.gold_associations
          SET coverage_polygon = (
            SELECT ST_ConvexHull(ST_Collect(ST_Transform(c.location_geography::geometry, 4326)))
            FROM gold.gold_affiliations a
            JOIN gold.gold_companies c ON c.id = a.client_id
            WHERE a.association_id = ${associationId}
              AND c.location_geography IS NOT NULL
              AND a.is_current = true
          ),
          updated_at = NOW()
          WHERE id = ${associationId}
            AND tenant_id = ${tenantId}
        `);

        job.log(`[G42] Coverage polygon updated via ConvexHull (${memberCount} points)`);

        // ── 6. Actualizare goldClusters ────────────────────────────────────
        // Verifică dacă există un cluster MANUAL pentru această asociație
        const existingClusters = await db
          .select({ id: goldClusters.id })
          .from(goldClusters)
          .where(
            and(
              eq(goldClusters.tenantId, tenantId),
              eq(goldClusters.name, association.name),
              eq(goldClusters.detectionMethod, "MANUAL"),
            ),
          )
          .limit(1);

        let clusterUpdated: boolean;

        if (existingClusters.length === 0) {
          // INSERT cluster nou pentru asociație
          await db.insert(goldClusters).values({
            tenantId,
            name: association.name,
            detectionMethod: "MANUAL",
            memberCount,
            updatedAt: new Date(),
          });
          job.log(`[G42] Cluster MANUAL creat pentru asociație '${association.name}'`);
          clusterUpdated = true;
        } else {
          // UPDATE memberCount
          await db
            .update(goldClusters)
            .set({
              memberCount,
              updatedAt: new Date(),
            })
            .where(eq(goldClusters.id, existingClusters[0].id));
          job.log(`[G42] Cluster MANUAL actualizat: memberCount=${memberCount}`);
          clusterUpdated = true;
        }

        job.log(
          `[G42] Done: associationId=${associationId}, memberLocationsUsed=${memberCount}, clusterUpdated=${clusterUpdated}`,
        );

        return {
          ok: true,
          associationId,
          polygonUpdated: true,
          memberLocationsUsed: memberCount,
          clusterUpdated,
        };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 3,
    },
  );

  return worker;
}
