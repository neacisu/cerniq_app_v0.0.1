/**
 * d23-kol-identify.ts — Worker D23: KOL Identify (Plan §X FAZA 9e)
 *
 * Queue: kol:identify (REDIS_DB_E5=5)
 * Timeout: 60s (Plan §X D23)
 * Rate limit: 10/min (Plan L2301)
 *
 * Responsabilitate:
 *   - Primește topNodes cu metrici centralitate de la D22
 *   - Aplică formula KOL Score (Plan L2293):
 *     kolScore = degree × 0.3 + betweenness × 100 × 0.3 + eigenvector × 100 × 0.2 + pagerank × 100 × 0.2
 *   - KOL criterii (Plan L2298): degree ≥ 5 AND betweenness ≥ 0.1 AND eigenvector ≥ 0.2
 *   - KOL Tiers (Plan L2299): EMERGING ≥40, ESTABLISHED ≥60, ELITE ≥80
 *   - UPSERT gold_kol_profiles cu kolTier, overallKolScore, all centrality measures
 *   - UPDATE gold_nurturing_state SET isKol = true
 *   - UPDATE gold_cluster_members SET isKol = true
 *
 * Anti-halucin. FAZA 9e:
 *   (C) Formula EXACTĂ din plan L2293 — NU modifica coeficienții
 *   (D) Timeout 60s exact
 */

import type { Job, Worker } from "bullmq";
import {
  db,
  goldKolProfiles,
  goldNurturingState,
  goldClusterMembers,
  sql,
  eq,
  and,
} from "@cerniq/db";
import { QUEUES, createWorker, withCognitiveSpan } from "@cerniq/worker-shared";
import { e5KolProfilesTotal } from "../lib/e5-metrics.js";
import type { TopCentralityNode } from "./d22-centrality-calculate.js";

// ---------------------------------------------------------------------------
// Constante KOL (Plan §X L2293, L2298, L2299)
// ---------------------------------------------------------------------------

/** KOL Score formula din plan L2293 — NU modifica coeficienții */
function calcKolScore(node: TopCentralityNode): number {
  return (
    node.degree * 0.3 +
    node.betweennessCentrality * 100 * 0.3 +
    node.eigenvectorCentrality * 100 * 0.2 +
    node.pagerank * 100 * 0.2
  );
}

/** KOL criterii de eligibilitate (Plan L2298) */
function isKolEligible(node: TopCentralityNode): boolean {
  return node.degree >= 5 && node.betweennessCentrality >= 0.1 && node.eigenvectorCentrality >= 0.2;
}

/** KOL Tier pe baza scorului (Plan L2299) */
function getKolTier(score: number): "EMERGING" | "ESTABLISHED" | "ELITE" | null {
  if (score >= 80) return "ELITE";
  if (score >= 60) return "ESTABLISHED";
  if (score >= 40) return "EMERGING";
  return null; // sub prag — nu e KOL
}

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface KolIdentifyJobData {
  tenantId: string;
  topNodes: TopCentralityNode[];
  correlationId?: string;
}

export interface KolIdentifyResult {
  ok: boolean;
  kolProfilesUpserted: number;
  kolByTier: { EMERGING: number; ESTABLISHED: number; ELITE: number };
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createKolIdentifyWorker(): Worker {
  const { worker } = createWorker<KolIdentifyJobData>(
    QUEUES.E5_KOL_IDENTIFY,
    async (job: Job<KolIdentifyJobData>): Promise<KolIdentifyResult> => {
      return withCognitiveSpan("e5:kol:identify", async () => {
        const startedAt = Date.now();
        const { tenantId, topNodes } = job.data;

        job.log(
          `[D23] Starting KOL identification: ${topNodes.length} candidates for tenant ${tenantId}`,
        );

        let kolProfilesUpserted = 0;
        const kolByTier = { EMERGING: 0, ESTABLISHED: 0, ELITE: 0 };

        for (const node of topNodes) {
          // Verificăm eligibilitate KOL (Plan L2298)
          if (!isKolEligible(node)) continue;

          // Calculăm KOL Score (Plan L2293 — formula exactă)
          const kolScore = calcKolScore(node);
          const tier = getKolTier(kolScore);

          if (!tier) continue; // sub prag EMERGING (40)

          const kolScoreRounded = Math.round(kolScore * 100) / 100;

          // UPSERT gold_kol_profiles
          await db
            .insert(goldKolProfiles)
            .values({
              tenantId,
              clientId: node.nodeId,
              kolTier: tier,
              overallKolScore: String(kolScoreRounded),
              networkCentrality: String(
                Math.round(
                  (node.degreeCentrality * 0.3 +
                    node.betweennessCentrality * 0.3 +
                    node.eigenvectorCentrality * 0.2 +
                    node.pagerank * 0.2) *
                    10000,
                ) / 10000,
              ),
              degreeCentrality: node.degree,
              betweennessCentrality: String(
                Math.round(node.betweennessCentrality * 1_000_000) / 1_000_000,
              ),
              eigenvectorCentrality: String(
                Math.round(node.eigenvectorCentrality * 1_000_000) / 1_000_000,
              ),
              pageRank: String(Math.round(node.pagerank * 1_000_000) / 1_000_000),
              directConnections: node.degree,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [goldKolProfiles.tenantId, goldKolProfiles.clientId],
              set: {
                kolTier: sql`EXCLUDED.kol_tier`,
                overallKolScore: sql`EXCLUDED.overall_kol_score`,
                networkCentrality: sql`EXCLUDED.network_centrality`,
                degreeCentrality: sql`EXCLUDED.degree_centrality`,
                betweennessCentrality: sql`EXCLUDED.betweenness_centrality`,
                eigenvectorCentrality: sql`EXCLUDED.eigenvector_centrality`,
                pageRank: sql`EXCLUDED.page_rank`,
                directConnections: sql`EXCLUDED.direct_connections`,
                updatedAt: sql`NOW()`,
              },
            });

          kolProfilesUpserted++;
          kolByTier[tier]++;

          // UPDATE gold_nurturing_state SET isKol = true
          await db
            .update(goldNurturingState)
            .set({ isKol: true })
            .where(
              and(
                eq(goldNurturingState.tenantId, tenantId),
                eq(goldNurturingState.leadId, node.nodeId),
              ),
            );

          // UPDATE gold_cluster_members SET isKol = true
          await db
            .update(goldClusterMembers)
            .set({ isKol: true })
            .where(eq(goldClusterMembers.clientId, node.nodeId));
        }

        // Actualizăm metrici Prometheus KOL per tier
        e5KolProfilesTotal.set({ tenant_id: tenantId, tier: "EMERGING" }, kolByTier.EMERGING);
        e5KolProfilesTotal.set({ tenant_id: tenantId, tier: "ESTABLISHED" }, kolByTier.ESTABLISHED);
        e5KolProfilesTotal.set({ tenant_id: tenantId, tier: "ELITE" }, kolByTier.ELITE);

        const durationMs = Date.now() - startedAt;
        job.log(
          `[D23] Done: ${kolProfilesUpserted} KOL profiles upserted ` +
            `(EMERGING=${kolByTier.EMERGING}, ESTABLISHED=${kolByTier.ESTABLISHED}, ELITE=${kolByTier.ELITE}), ` +
            `${durationMs}ms`,
        );

        return {
          ok: true,
          kolProfilesUpserted,
          kolByTier,
          durationMs,
        };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 1,
    },
  );

  return worker;
}
