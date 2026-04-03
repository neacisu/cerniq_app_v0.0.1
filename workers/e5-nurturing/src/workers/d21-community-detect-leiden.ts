/**
 * d21-community-detect-leiden.ts — Worker D21: Leiden Community Detection (Plan §X FAZA 9e)
 *
 * Queue: community:detect:leiden (REDIS_DB_E5=5)
 * Timeout: 600s (Plan §X D21 — CPU INTENSIVE)
 * Cron: Weekly Sunday (Plan L2340)
 * Rate limit: 10/min (Plan L2301)
 *
 * Responsabilitate:
 *   - Primește graph JSON path de la D20
 *   - Apelează Python3 subprocess: leiden_service.py --action leiden
 *   - UPSERT gold_clusters cu detectionMethod='LEIDEN', modularityScore
 *   - UPSERT gold_cluster_members per community assignment
 *   - Enqueue D22 (centrality:calculate) cu același graph
 *
 * Anti-halucin. FAZA 9e:
 *   (A) cdlib Leiden, NU Louvain
 *   (B) Python subprocess cu JSON I/O
 *   (D) Timeout 600s exact
 *   (F) Resolution 1.0, min_community 3 — din plan L2291
 */

import { promises as fs } from "node:fs";
import type { Job, Worker } from "bullmq";
import { db, goldClusters, goldClusterMembers, sql } from "@cerniq/db";
import { QUEUES, createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";
import { runLeidenCommunityDetect } from "../lib/leiden-client.js";
import { e5LeidenPythonSeconds, e5CommunitiesDetected } from "../lib/e5-metrics.js";
import type { GraphData } from "../lib/leiden-client.js";

// Timeout intern pentru Python subprocess (600s + 60s buffer)
const LEIDEN_SUBPROCESS_TIMEOUT_MS = 660_000;

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface CommunityDetectLeidenJobData {
  tenantId: string;
  graphFilePath: string;
  nodeCount: number;
  edgeCount: number;
  /** Dacă true, enqueue și D24 după D22 */
  includeImplicitDetect?: boolean;
  correlationId?: string;
}

export interface CommunityDetectLeidenResult {
  ok: boolean;
  communities: number;
  modularity: number;
  clustersUpserted: number;
  membersUpserted: number;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createCommunityDetectLeidenWorker(): Worker {
  const centralityQueue = createQueue(QUEUES.E5_CENTRALITY_CALCULATE, { db: 5 });

  const { worker } = createWorker<CommunityDetectLeidenJobData>(
    QUEUES.E5_COMMUNITY_DETECT_LEIDEN,
    async (job: Job<CommunityDetectLeidenJobData>): Promise<CommunityDetectLeidenResult> => {
      return withCognitiveSpan("e5:community:detect-leiden", async () => {
        const startedAt = Date.now();
        const { tenantId, graphFilePath, nodeCount, edgeCount } = job.data;

        job.log(
          `[D21] Starting Leiden detection: ${nodeCount} nodes, ${edgeCount} edges, ` +
            `graph=${graphFilePath}`,
        );

        // ── 1. Verificare fișier graph ─────────────────────────────────────
        let graphData: GraphData;
        try {
          const raw = await fs.readFile(graphFilePath, "utf-8");
          graphData = JSON.parse(raw) as GraphData;
        } catch (err) {
          throw new Error(
            `[D21] Cannot read graph file ${graphFilePath}: ${(err as Error).message}`,
            { cause: err },
          );
        }

        if (!graphData.nodes || graphData.nodes.length === 0) {
          job.log("[D21] Empty graph — no communities to detect");
          return {
            ok: false,
            communities: 0,
            modularity: 0,
            clustersUpserted: 0,
            membersUpserted: 0,
            durationMs: Date.now() - startedAt,
          };
        }

        // ── 2. Apel Python3 Leiden subprocess ─────────────────────────────
        const pythonTimer = e5LeidenPythonSeconds.startTimer({
          action: "leiden",
          tenant_id: tenantId,
        });

        const leidenResult = await runLeidenCommunityDetect(graphData, {
          timeoutMs: LEIDEN_SUBPROCESS_TIMEOUT_MS,
          resolution: 1, // Plan L2291
          minCommunitySize: 3, // Plan L2291
        });

        pythonTimer();

        if (
          leidenResult.error === "empty_graph" ||
          leidenResult.error === "empty_graph_after_build"
        ) {
          job.log(`[D21] Python reported empty graph: ${leidenResult.error}`);
          return {
            ok: false,
            communities: 0,
            modularity: 0,
            clustersUpserted: 0,
            membersUpserted: 0,
            durationMs: Date.now() - startedAt,
          };
        }

        job.log(
          `[D21] Leiden done: ${leidenResult.n_communities} communities, ` +
            `modularity=${leidenResult.modularity}, filtered=${leidenResult.filtered_by_min_size}`,
        );

        // ── 3. UPSERT gold_clusters per community ──────────────────────────
        let clustersUpserted = 0;
        let membersUpserted = 0;
        const clusterIds: string[] = [];

        for (let commIdx = 0; commIdx < leidenResult.communities.length; commIdx++) {
          const community = leidenResult.communities[commIdx];
          const communityName = `Leiden-${tenantId.slice(0, 8)}-C${commIdx + 1}`;

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
            clusterIds.push(clusterId);
            clustersUpserted++;

            // UPSERT gold_cluster_members per nod din comunitate
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
                    centralityScore: sql`EXCLUDED.centrality_score`,
                  },
                });

              membersUpserted++;
            }
          }
        }

        // ── 4. Update Prometheus metric ────────────────────────────────────
        e5CommunitiesDetected.set(
          { tenant_id: tenantId, method: "LEIDEN" },
          leidenResult.n_communities,
        );

        const durationMs = Date.now() - startedAt;
        job.log(
          `[D21] Done: ${clustersUpserted} clusters upserted, ${membersUpserted} members, ` +
            `${durationMs}ms`,
        );

        // ── 5. Enqueue D22 centrality calculate ───────────────────────────
        await centralityQueue.add(
          "centrality-calculate",
          {
            tenantId,
            graphFilePath,
            nodeCount,
            edgeCount,
            communityMap: leidenResult.node_community_map,
            clusterIds,
            includeImplicitDetect: job.data.includeImplicitDetect ?? false,
            correlationId: job.data.correlationId,
          },
          {
            jobId: `centrality-${tenantId}-${Date.now()}`,
          },
        );

        return {
          ok: true,
          communities: leidenResult.n_communities,
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
