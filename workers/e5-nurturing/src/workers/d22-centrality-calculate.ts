/**
 * d22-centrality-calculate.ts — Worker D22: Centrality Calculate (Plan §X FAZA 9e)
 *
 * Queue: centrality:calculate (REDIS_DB_E5=5)
 * Timeout: 300s (Plan §X D22)
 * Rate limit: 10/min (Plan L2301)
 *
 * Responsabilitate:
 *   - Apelează Python3 subprocess cu networkx/igraph pentru:
 *     * degree_centrality, betweenness_centrality, eigenvector_centrality, pagerank
 *   - Normalizare scoruri [0,1] — făcută în Python (leiden_service.py)
 *   - UPDATE gold_cluster_members SET centralityScore per nod
 *   - Enqueue D23 (kol:identify) cu top centrality nodes
 *
 * Anti-halucin. FAZA 9e:
 *   (D) Timeout 300s exact
 *   (E) Rate limit 10/min
 */

import { promises as fs } from "node:fs";
import type { Job, Worker } from "bullmq";
import { db, goldClusterMembers, and, eq } from "@cerniq/db";
import { QUEUES, createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";
import { runCentralityCalculate } from "../lib/leiden-client.js";
import { e5LeidenPythonSeconds } from "../lib/e5-metrics.js";
import type { GraphData, CentralityResult } from "../lib/leiden-client.js";

// Timeout intern subprocess (300s + 60s buffer)
const CENTRALITY_SUBPROCESS_TIMEOUT_MS = 360_000;

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface CentralityCalculateJobData {
  tenantId: string;
  graphFilePath: string;
  nodeCount: number;
  edgeCount: number;
  /** Map node_index → community_index din D21 */
  communityMap: Record<string, number>;
  /** IDs clustere create de D21 (în ordinea community_index) */
  clusterIds: string[];
  includeImplicitDetect?: boolean;
  correlationId?: string;
}

export interface CentralityCalculateResult {
  ok: boolean;
  nodesProcessed: number;
  membersUpdated: number;
  topNodes: TopCentralityNode[];
  durationMs: number;
}

export interface TopCentralityNode {
  nodeId: string;
  nodeIndex: number;
  degree: number;
  degreeCentrality: number;
  betweennessCentrality: number;
  eigenvectorCentrality: number;
  pagerank: number;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createCentralityCalculateWorker(): Worker {
  const kolQueue = createQueue(QUEUES.E5_KOL_IDENTIFY, { db: 5 });
  const implicitQueue = createQueue(QUEUES.E5_CLUSTER_IMPLICIT_DETECT, { db: 5 });

  const { worker } = createWorker<CentralityCalculateJobData>(
    QUEUES.E5_CENTRALITY_CALCULATE,
    async (job: Job<CentralityCalculateJobData>): Promise<CentralityCalculateResult> => {
      return withCognitiveSpan("e5:centrality:calculate", async () => {
        const startedAt = Date.now();
        const { tenantId, graphFilePath, communityMap, clusterIds } = job.data;

        job.log(
          `[D22] Starting centrality: ${job.data.nodeCount} nodes, ${job.data.edgeCount} edges`,
        );

        // ── 1. Citim graph-ul ───────────────────────────────────────────────
        let graphData: GraphData;
        try {
          const raw = await fs.readFile(graphFilePath, "utf-8");
          graphData = JSON.parse(raw) as GraphData;
        } catch (err) {
          throw new Error(
            `[D22] Cannot read graph file ${graphFilePath}: ${(err as Error).message}`,
            { cause: err },
          );
        }

        if (!graphData.nodes || graphData.nodes.length === 0) {
          job.log("[D22] Empty graph — skipping centrality");
          return {
            ok: false,
            nodesProcessed: 0,
            membersUpdated: 0,
            topNodes: [],
            durationMs: Date.now() - startedAt,
          };
        }

        // ── 2. Apel Python3 centrality subprocess ──────────────────────────
        const pythonTimer = e5LeidenPythonSeconds.startTimer({
          action: "centrality",
          tenant_id: tenantId,
        });

        const centralityResult: CentralityResult = await runCentralityCalculate(graphData, {
          timeoutMs: CENTRALITY_SUBPROCESS_TIMEOUT_MS,
        });

        pythonTimer();

        if (
          centralityResult.error ||
          !centralityResult.nodes ||
          centralityResult.nodes.length === 0
        ) {
          job.log(`[D22] Python error or empty result: ${centralityResult.error ?? "empty"}`);
          return {
            ok: false,
            nodesProcessed: 0,
            membersUpdated: 0,
            topNodes: [],
            durationMs: Date.now() - startedAt,
          };
        }

        job.log(`[D22] Centrality computed for ${centralityResult.nodes.length} nodes`);

        // ── 3. UPDATE gold_cluster_members cu centralityScore ──────────────
        let membersUpdated = 0;

        for (const node of centralityResult.nodes) {
          const nodeIdx = String(node.index);
          const commIdx = communityMap[nodeIdx];

          if (commIdx === undefined) continue;
          const clusterId = clusterIds[commIdx];
          if (!clusterId) continue;

          // centralityScore = media ponderată a celor 4 metrici
          // Ponderare: degree*0.3 + betweenness*0.3 + eigenvector*0.2 + pagerank*0.2
          const centralityScore =
            node.degree_centrality * 0.3 +
            node.betweenness_centrality * 0.3 +
            node.eigenvector_centrality * 0.2 +
            node.pagerank * 0.2;

          const centralityScoreStr = String(Math.round(centralityScore * 10000) / 10000);

          // Determinăm membership type: CORE dacă score > 0.5, altfel PERIPHERAL
          const membershipType = centralityScore >= 0.5 ? "CORE" : "PERIPHERAL";

          await db
            .update(goldClusterMembers)
            .set({
              centralityScore: centralityScoreStr,
              membershipType,
            })
            .where(
              and(
                eq(goldClusterMembers.clusterId, clusterId),
                eq(goldClusterMembers.clientId, node.id),
              ),
            );

          membersUpdated++;
        }

        // ── 4. Identificăm top nodes pentru D23 (KOL candidates) ───────────
        // Top nodes cu degree >= 3 (pre-filter înainte de D23 care aplică criterii stricte)
        const topNodes: TopCentralityNode[] = centralityResult.nodes
          .filter((n) => n.degree >= 3)
          .sort((a, b) => {
            // Sort descending by composite score
            const scoreA =
              a.degree_centrality * 0.3 +
              a.betweenness_centrality * 0.3 +
              a.eigenvector_centrality * 0.2 +
              a.pagerank * 0.2;
            const scoreB =
              b.degree_centrality * 0.3 +
              b.betweenness_centrality * 0.3 +
              b.eigenvector_centrality * 0.2 +
              b.pagerank * 0.2;
            return scoreB - scoreA;
          })
          .slice(0, 100) // max 100 top candidates pentru D23
          .map((n) => ({
            nodeId: n.id,
            nodeIndex: n.index,
            degree: n.degree,
            degreeCentrality: n.degree_centrality,
            betweennessCentrality: n.betweenness_centrality,
            eigenvectorCentrality: n.eigenvector_centrality,
            pagerank: n.pagerank,
          }));

        const durationMs = Date.now() - startedAt;
        job.log(
          `[D22] Done: ${membersUpdated} members updated, ${topNodes.length} KOL candidates, ` +
            `${durationMs}ms`,
        );

        // ── 5. Enqueue D23 KOL identify ────────────────────────────────────
        await kolQueue.add(
          "kol-identify",
          {
            tenantId,
            topNodes,
            correlationId: job.data.correlationId,
          },
          {
            jobId: `kol-${tenantId}-${Date.now()}`,
          },
        );

        // ── 6. Enqueue D24 dacă solicitat ──────────────────────────────────
        if (job.data.includeImplicitDetect) {
          await implicitQueue.add(
            "cluster-implicit-detect",
            {
              tenantId,
              graphFilePath,
              nodeCount: job.data.nodeCount,
              edgeCount: job.data.edgeCount,
              correlationId: job.data.correlationId,
            },
            {
              jobId: `implicit-${tenantId}-${Date.now()}`,
            },
          );
        }

        return {
          ok: true,
          nodesProcessed: centralityResult.nodes.length,
          membersUpdated,
          topNodes,
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
