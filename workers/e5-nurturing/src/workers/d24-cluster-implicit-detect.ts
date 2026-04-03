/**
 * d24-cluster-implicit-detect.ts — Worker D24: Implicit Cluster Detection (Plan §X FAZA 9e)
 *
 * Queue: cluster:implicit:detect (REDIS_DB_E5=5)
 * Timeout: 180s (Plan §X D24)
 * Rate limit: 10/min (Plan L2301)
 *
 * Responsabilitate:
 *   - Detectare clustere fără afiliere explicită (nu OUAI/Cooperative)
 *   - Bazat pe: proximity + behavioral similarity + shared connections
 *   - Leiden cu resolution mai mare (1.5) pentru sub-communities
 *   - UPSERT gold_clusters cu detectionMethod='LEIDEN' (implicit clusters)
 *
 * Diferențe față de D21:
 *   - Resolution = 1.5 (mai mare, detectează sub-communities)
 *   - Filtrează nodurile cu relații ONLY NEIGHBOR sau BEHAVIORAL_CLUSTER
 *     (implicit relationships — fără SAME_ASSOCIATION/SHARED_SHAREHOLDER)
 *
 * Anti-halucin. FAZA 9e:
 *   (A) cdlib Leiden, NU Louvain
 *   (D) Timeout 180s exact
 *   (F) Resolution 1.5 pentru sub-communities
 */

import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Job, Worker } from "bullmq";
import { db, goldClusters, goldClusterMembers, sql } from "@cerniq/db";
import { QUEUES, createWorker, withCognitiveSpan } from "@cerniq/worker-shared";
import { runLeidenImplicitDetect } from "../lib/leiden-client.js";
import { e5LeidenPythonSeconds, e5CommunitiesDetected } from "../lib/e5-metrics.js";
import type { GraphData } from "../lib/leiden-client.js";

// Timeout intern subprocess (180s + 60s buffer)
const IMPLICIT_SUBPROCESS_TIMEOUT_MS = 240_000;

// Tipuri relații implicite (fără asociații explicite)
const IMPLICIT_RELATION_TYPES = new Set(["NEIGHBOR", "BEHAVIORAL_CLUSTER"]);

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface ClusterImplicitDetectJobData {
  tenantId: string;
  graphFilePath: string;
  nodeCount: number;
  edgeCount: number;
  correlationId?: string;
}

export interface ClusterImplicitDetectResult {
  ok: boolean;
  implicitCommunities: number;
  modularity: number;
  clustersUpserted: number;
  membersUpserted: number;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createClusterImplicitDetectWorker(): Worker {
  const { worker } = createWorker<ClusterImplicitDetectJobData>(
    QUEUES.E5_CLUSTER_IMPLICIT_DETECT,
    async (job: Job<ClusterImplicitDetectJobData>): Promise<ClusterImplicitDetectResult> => {
      return withCognitiveSpan("e5:cluster:implicit-detect", async () => {
        const startedAt = Date.now();
        const { tenantId, graphFilePath } = job.data;

        job.log(`[D24] Starting implicit cluster detection for tenant ${tenantId}`);

        // ── 1. Citim graph-ul complet ──────────────────────────────────────
        let graphData: GraphData;
        try {
          const raw = await fs.readFile(graphFilePath, "utf-8");
          graphData = JSON.parse(raw) as GraphData;
        } catch (err) {
          throw new Error(
            `[D24] Cannot read graph file ${graphFilePath}: ${(err as Error).message}`,
            { cause: err },
          );
        }

        if (!graphData.nodes || graphData.nodes.length === 0) {
          job.log("[D24] Empty graph — skipping implicit detection");
          return {
            ok: false,
            implicitCommunities: 0,
            modularity: 0,
            clustersUpserted: 0,
            membersUpserted: 0,
            durationMs: Date.now() - startedAt,
          };
        }

        // ── 2. Filtrăm graph-ul pentru relații implicite ───────────────────
        // Păstrăm DOAR edges de tip NEIGHBOR sau BEHAVIORAL_CLUSTER
        const implicitEdges = graphData.edges.filter((e) => IMPLICIT_RELATION_TYPES.has(e.type));

        if (implicitEdges.length === 0) {
          job.log("[D24] No implicit relationships found — skipping");
          return {
            ok: false,
            implicitCommunities: 0,
            modularity: 0,
            clustersUpserted: 0,
            membersUpserted: 0,
            durationMs: Date.now() - startedAt,
          };
        }

        // Construim graph filtrat pentru sub-community detection
        const implicitGraph: GraphData = {
          nodes: graphData.nodes,
          edges: implicitEdges,
        };

        job.log(
          `[D24] Implicit graph: ${implicitGraph.nodes.length} nodes, ${implicitEdges.length} edges (implicit only)`,
        );

        // ── 3. Scriem graph filtrat în tmpfile ────────────────────────────
        const implicitGraphPath = join(
          tmpdir(),
          `cerniq_implicit_${tenantId}_${randomUUID()}.json`,
        );
        await fs.writeFile(implicitGraphPath, JSON.stringify(implicitGraph), "utf-8");

        // ── 4. Leiden implicit cu resolution=1.5 ──────────────────────────
        const pythonTimer = e5LeidenPythonSeconds.startTimer({
          action: "leiden_implicit",
          tenant_id: tenantId,
        });

        let leidenResult;
        try {
          leidenResult = await runLeidenImplicitDetect(implicitGraph, {
            timeoutMs: IMPLICIT_SUBPROCESS_TIMEOUT_MS,
            resolution: 1.5, // Plan §X D24 — sub-communities
            minCommunitySize: 3,
          });
        } finally {
          pythonTimer();
          // Cleanup tmpfile graph filtrat
          await fs.unlink(implicitGraphPath).catch(() => {});
        }

        if (
          leidenResult.error === "empty_graph" ||
          leidenResult.error === "empty_graph_after_build" ||
          leidenResult.n_communities === 0
        ) {
          job.log(
            `[D24] No implicit communities detected: ${leidenResult.error ?? "0 communities"}`,
          );
          return {
            ok: false,
            implicitCommunities: 0,
            modularity: 0,
            clustersUpserted: 0,
            membersUpserted: 0,
            durationMs: Date.now() - startedAt,
          };
        }

        job.log(
          `[D24] Implicit Leiden done: ${leidenResult.n_communities} communities, ` +
            `modularity=${leidenResult.modularity}`,
        );

        // ── 5. UPSERT gold_clusters pentru implicit clusters ───────────────
        let clustersUpserted = 0;
        let membersUpserted = 0;

        for (let commIdx = 0; commIdx < leidenResult.communities.length; commIdx++) {
          const community = leidenResult.communities[commIdx];
          // Prefix "IMPLICIT" pentru a distinge de clusterele D21
          const communityName = `Implicit-${tenantId.slice(0, 8)}-C${commIdx + 1}`;

          const upserted = await db
            .insert(goldClusters)
            .values({
              tenantId,
              name: communityName,
              detectionMethod: "LEIDEN",
              modularityScore: String(leidenResult.modularity),
              cohesionScore: "0",
              memberCount: community.length,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [goldClusters.tenantId, goldClusters.name],
              set: {
                modularityScore: sql`EXCLUDED.modularity_score`,
                memberCount: sql`EXCLUDED.member_count`,
                updatedAt: sql`NOW()`,
              },
            })
            .returning({ id: goldClusters.id });

          if (upserted.length > 0) {
            const clusterId = upserted[0].id;
            clustersUpserted++;

            // UPSERT gold_cluster_members
            for (const nodeIdx of community) {
              const node = graphData.nodes[nodeIdx];
              if (!node) continue;

              await db
                .insert(goldClusterMembers)
                .values({
                  clusterId,
                  clientId: node.id,
                  membershipType: "PERIPHERAL",
                  centralityScore: "0",
                  isKol: false,
                  createdAt: new Date(),
                })
                .onConflictDoUpdate({
                  target: [goldClusterMembers.clusterId, goldClusterMembers.clientId],
                  set: {
                    membershipType: sql`EXCLUDED.membership_type`,
                  },
                });

              membersUpserted++;
            }
          }
        }

        // Actualizăm metrici Prometheus
        e5CommunitiesDetected.set(
          { tenant_id: tenantId, method: "LEIDEN_IMPLICIT" },
          leidenResult.n_communities,
        );

        const durationMs = Date.now() - startedAt;
        job.log(
          `[D24] Done: ${clustersUpserted} implicit clusters upserted, ` +
            `${membersUpserted} members, ${durationMs}ms`,
        );

        return {
          ok: true,
          implicitCommunities: leidenResult.n_communities,
          modularity: leidenResult.modularity,
          clustersUpserted,
          membersUpserted,
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
