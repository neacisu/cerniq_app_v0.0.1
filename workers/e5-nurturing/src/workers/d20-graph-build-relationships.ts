/**
 * d20-graph-build-relationships.ts — Worker D20: Graph Build Relationships (Plan §X FAZA 9e)
 *
 * Queue: graph:build:relationships (REDIS_DB_E5=5)
 * Timeout: 120s (Plan §X D20)
 * Cron: Weekly Sunday (Plan L2339)
 * Rate limit: 10/min (CPU intensive, Plan L2301)
 *
 * Responsabilitate:
 *   - SELECT toate gold_entity_relationships WHERE tenantId
 *   - SELECT toate gold_companies (nodes) din relații
 *   - Construiește graph JSON: {nodes, edges} cu weights per relationType
 *   - Enqueue D21 (community:detect:leiden) cu graph-ul construit
 *
 * Weight per relationType (Plan §X D20):
 *   NEIGHBOR: 1.0 - (distance / maxDistance)
 *   SAME_ASSOCIATION: 0.8
 *   SHARED_SHAREHOLDER: 0.9
 *   RECOMMENDED_BY: 0.7
 *   BEHAVIORAL_CLUSTER: 0.5
 *
 * Anti-halucin. FAZA 9e:
 *   (B) Graph JSON scris în tmpfile — D21 îl citește prin Python subprocess
 *   (D) Timeout 120s exact — BullMQ timeout
 *   (E) Rate limit 10/min pe graph:* queue
 */

import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Job, Worker } from "bullmq";
import { db, goldEntityRelationships, goldCompanies, and, eq, inArray } from "@cerniq/db";
import { QUEUES, createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";
import { e5GraphBuildSeconds } from "../lib/e5-metrics.js";
import type { GraphData } from "../lib/leiden-client.js";

// ---------------------------------------------------------------------------
// Constante weight per relationType (Plan §X D20)
// ---------------------------------------------------------------------------

const RELATION_TYPE_WEIGHTS: Record<string, number> = {
  SAME_ASSOCIATION: 0.8,
  SHARED_SHAREHOLDER: 0.9,
  RECOMMENDED_BY: 0.7,
  BEHAVIORAL_CLUSTER: 0.5,
};

// Distanță maximă pentru normalizare weight NEIGHBOR (50km = 50_000m)
const MAX_DISTANCE_METERS = 50_000;

// ---------------------------------------------------------------------------
// Tipuri interne
// ---------------------------------------------------------------------------

interface RelationshipRow {
  id: string;
  entityAId: string;
  entityBId: string;
  relationType: string;
  distanceMeters: string | null;
  confidence: string;
  bidirectional: boolean;
}

interface CompanyRow {
  id: string;
  denumire: string | null;
  judetCod: string | null;
  cifraAfaceri: string | null;
}

// ---------------------------------------------------------------------------
// Tipuri exportate
// ---------------------------------------------------------------------------

export interface GraphBuildRelationshipsJobData {
  tenantId: string;
  /** Dacă true, enqueue și D24 (implicit clusters) după D21 */
  includeImplicitDetect?: boolean;
  correlationId?: string;
}

export interface GraphBuildRelationshipsResult {
  ok: boolean;
  nodeCount: number;
  edgeCount: number;
  graphFilePath: string;
  durationMs: number;
  relationshipCount: number;
}

// ---------------------------------------------------------------------------
// Helper: construiește nodes din companies + relații orfane
// ---------------------------------------------------------------------------

function buildNodesFromCompanies(
  companies: CompanyRow[],
  nodeIdList: string[],
): { nodes: GraphData["nodes"]; nodeIndexMap: Map<string, number> } {
  const nodeIndexMap = new Map<string, number>();
  const nodes: GraphData["nodes"] = [];

  for (const company of companies) {
    const idx = nodes.length;
    nodeIndexMap.set(company.id, idx);
    nodes.push({
      id: company.id,
      index: idx,
      properties: {
        denumire: company.denumire,
        judetCod: company.judetCod,
        cifraAfaceri: company.cifraAfaceri == null ? null : Number(company.cifraAfaceri),
      },
    });
  }

  // Noduri din relații care nu sunt în gold_companies (edge case: relații orfane)
  for (const nodeId of nodeIdList) {
    if (!nodeIndexMap.has(nodeId)) {
      const idx = nodes.length;
      nodeIndexMap.set(nodeId, idx);
      nodes.push({ id: nodeId, index: idx, properties: {} });
    }
  }

  return { nodes, nodeIndexMap };
}

function calcNeighborWeight(distanceMeters: string | null, maxDistanceMeters: number): number {
  const dist = distanceMeters == null ? 0 : Number(distanceMeters);
  return Math.max(0.01, 1 - dist / maxDistanceMeters);
}

function calcMaxDistance(relationships: RelationshipRow[]): number {
  let maxDist = MAX_DISTANCE_METERS;
  for (const rel of relationships) {
    if (rel.relationType === "NEIGHBOR" && rel.distanceMeters != null) {
      const dist = Number(rel.distanceMeters);
      if (dist > maxDist) maxDist = dist;
    }
  }
  return maxDist;
}

function buildEdges(
  relationships: RelationshipRow[],
  nodeIndexMap: Map<string, number>,
  maxDistanceMeters: number,
): GraphData["edges"] {
  const edges: GraphData["edges"] = [];

  for (const rel of relationships) {
    const srcIdx = nodeIndexMap.get(rel.entityAId);
    const tgtIdx = nodeIndexMap.get(rel.entityBId);
    if (srcIdx === undefined || tgtIdx === undefined) continue;

    const baseWeight =
      rel.relationType === "NEIGHBOR"
        ? calcNeighborWeight(rel.distanceMeters, maxDistanceMeters)
        : (RELATION_TYPE_WEIGHTS[rel.relationType] ?? 0.5);

    const weight = Math.round(baseWeight * Math.max(0.1, Number(rel.confidence)) * 10000) / 10000;

    edges.push({ source: srcIdx, target: tgtIdx, weight, type: rel.relationType });
    if (rel.bidirectional) {
      edges.push({ source: tgtIdx, target: srcIdx, weight, type: rel.relationType });
    }
  }

  return edges;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createGraphBuildRelationshipsWorker(): Worker {
  const leidenQueue = createQueue(QUEUES.E5_COMMUNITY_DETECT_LEIDEN, { db: 5 });

  const { worker } = createWorker<GraphBuildRelationshipsJobData>(
    QUEUES.E5_GRAPH_BUILD_RELATIONSHIPS,
    async (job: Job<GraphBuildRelationshipsJobData>): Promise<GraphBuildRelationshipsResult> => {
      return withCognitiveSpan("e5:graph:build-relationships", async () => {
        const startedAt = Date.now();
        const { tenantId } = job.data;

        const queryTimer = e5GraphBuildSeconds.startTimer({ tenant_id: tenantId });

        // ── 1. SELECT toate relațiile pentru tenant ────────────────────────
        const relationships = await db
          .select({
            id: goldEntityRelationships.id,
            entityAId: goldEntityRelationships.entityAId,
            entityBId: goldEntityRelationships.entityBId,
            relationType: goldEntityRelationships.relationType,
            distanceMeters: goldEntityRelationships.distanceMeters,
            confidence: goldEntityRelationships.confidence,
            bidirectional: goldEntityRelationships.bidirectional,
          })
          .from(goldEntityRelationships)
          .where(eq(goldEntityRelationships.tenantId, tenantId));

        job.log(`[D20] Found ${relationships.length} relationships for tenant ${tenantId}`);

        if (relationships.length === 0) {
          queryTimer();
          job.log("[D20] No relationships found — skipping graph build");
          return {
            ok: false,
            nodeCount: 0,
            edgeCount: 0,
            graphFilePath: "",
            durationMs: Date.now() - startedAt,
            relationshipCount: 0,
          };
        }

        // ── 2. Colectăm unique node IDs ────────────────────────────────────
        const nodeIdSet = new Set<string>();
        for (const rel of relationships) {
          nodeIdSet.add(rel.entityAId);
          nodeIdSet.add(rel.entityBId);
        }
        const nodeIdList = Array.from(nodeIdSet);

        // ── 3. Fetch node properties din gold_companies ────────────────────
        const companies = await db
          .select({
            id: goldCompanies.id,
            denumire: goldCompanies.denumire,
            judetCod: goldCompanies.judetCod,
            cifraAfaceri: goldCompanies.cifraAfaceri,
          })
          .from(goldCompanies)
          .where(and(eq(goldCompanies.tenantId, tenantId), inArray(goldCompanies.id, nodeIdList)));

        // ── 4. Construieste nodes și edges via helpers ─────────────────────
        const { nodes, nodeIndexMap } = buildNodesFromCompanies(companies, nodeIdList);
        const maxDistanceMeters = calcMaxDistance(relationships);
        const edges = buildEdges(relationships, nodeIndexMap, maxDistanceMeters);

        queryTimer();

        // ── 5. Scriem graph JSON în tmpfile ────────────────────────────────
        const graphFilePath = join(tmpdir(), `cerniq_graph_${tenantId}_${randomUUID()}.json`);
        const graphData: GraphData = { nodes, edges };
        await fs.writeFile(graphFilePath, JSON.stringify(graphData), "utf-8");

        const durationMs = Date.now() - startedAt;
        job.log(
          `[D20] Graph built: ${nodes.length} nodes, ${edges.length} edges, ` +
            `${relationships.length} relationships → ${graphFilePath} in ${durationMs}ms`,
        );

        // ── 6. Enqueue D21 community detect ───────────────────────────────
        await leidenQueue.add(
          "community-detect",
          {
            tenantId,
            graphFilePath,
            nodeCount: nodes.length,
            edgeCount: edges.length,
            includeImplicitDetect: job.data.includeImplicitDetect ?? false,
            correlationId: job.data.correlationId,
          },
          {
            jobId: `leiden-${tenantId}-${Date.now()}`,
          },
        );

        return {
          ok: true,
          nodeCount: nodes.length,
          edgeCount: edges.length,
          graphFilePath,
          durationMs,
          relationshipCount: relationships.length,
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
