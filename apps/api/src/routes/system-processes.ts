/**
 * GET /api/v1/system/processes — agregare cozi (Monitoring API) + importuri active (tenant).
 * Autentificare JWT standard; date cozi prin fetch intern (ADMIN_KEY).
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, bronzeImportBatches, db, desc, eq, inArray, setSessionTenantId } from "@cerniq/db";
import { envConfig } from "../config.js";
import { requireTenantId } from "./utils.js";

const ROLE_RANK: Record<string, number> = {
  viewer: 10,
  operator: 20,
  manager: 30,
  admin: 40,
  owner: 50,
  superadmin: 60,
};

type QueueSnapshot = {
  name?: string;
  waiting?: number;
  active?: number;
  completed?: number;
  failed?: number;
  delayed?: number;
  paused?: boolean;
};

export type SystemProcessCategory =
  | "Imports"
  | "Enrichment Pipeline"
  | "Outreach Batches"
  | "AI Tasks"
  | "Other";

export type SystemProcessRow = {
  id: string;
  category: SystemProcessCategory;
  name: string;
  progressPercent: number | null;
  durationMs: number | null;
  status: "running" | "queued" | "paused" | "failed" | "completed";
  cancellable: boolean;
  cancel?: { kind: "import_batch"; batchId: string };
  startedAt: string | null;
  meta?: Record<string, unknown>;
};

function userRank(role: string | undefined): number {
  if (!role) return 0;
  return ROLE_RANK[role.toLowerCase()] ?? 0;
}

function categorizeQueue(name: string): SystemProcessCategory {
  const n = name.toLowerCase();
  if (
    /import|bronze|ingest|csv|excel|a1|a2|reprocess|promote|normalize|quarantine|runtime|batch/.test(
      n,
    )
  ) {
    return "Imports";
  }
  if (/outreach|wa:|instantly|sequence|lead|timeline|email:cold|email:warm|resend/.test(n)) {
    return "Outreach Batches";
  }
  if (
    /llm|gpt|openai|sentiment|negotiation|consensus|brain|cognitive|ai_|e3|oblio|vector|embedding/.test(
      n,
    )
  ) {
    return "AI Tasks";
  }
  if (
    /enrich|silver|discover|anaf|termene|pipeline|orchestr|gold|e1|e2|e4|e5|p1|k\d|i\d|j\d/.test(n)
  ) {
    return "Enrichment Pipeline";
  }
  return "Other";
}

function queueActivity(q: QueueSnapshot): number {
  return (q.waiting ?? 0) + (q.active ?? 0) + (q.delayed ?? 0) + (q.failed ?? 0);
}

function queueStatus(q: QueueSnapshot): SystemProcessRow["status"] {
  if (q.paused) return "paused";
  if ((q.failed ?? 0) > 0 && (q.active ?? 0) === 0 && (q.waiting ?? 0) === 0) return "failed";
  if ((q.active ?? 0) > 0) return "running";
  return "queued";
}

async function fetchMonitoringQueues(): Promise<{ queues: QueueSnapshot[]; ok: boolean }> {
  const base = envConfig.MONITORING_API_INTERNAL_URL.replace(/\/$/, "");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (envConfig.ADMIN_KEY) headers["x-admin-key"] = envConfig.ADMIN_KEY;
  try {
    const res = await fetch(`${base}/api/queues`, { headers });
    if (!res.ok) return { queues: [], ok: false };
    const body = (await res.json()) as { data?: QueueSnapshot[] };
    return { queues: Array.isArray(body.data) ? body.data : [], ok: true };
  } catch {
    return { queues: [], ok: false };
  }
}

export async function systemProcessesRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };

  app.get("/processes", { ...authOpts }, async (request, reply) => {
    const tenantId = requireTenantId(request);
    const user = request.user as { role?: string } | undefined;
    const canCancelImport = userRank(user?.role) >= ROLE_RANK.operator;

    await setSessionTenantId(tenantId);

    const [{ queues: queueSnapshots, ok: queuesOk }, batchRows] = await Promise.all([
      fetchMonitoringQueues(),
      db
        .select({
          id: bronzeImportBatches.id,
          filename: bronzeImportBatches.filename,
          status: bronzeImportBatches.status,
          processedRows: bronzeImportBatches.processedRows,
          totalRows: bronzeImportBatches.totalRows,
          createdAt: bronzeImportBatches.createdAt,
          updatedAt: bronzeImportBatches.updatedAt,
        })
        .from(bronzeImportBatches)
        .where(
          and(
            eq(bronzeImportBatches.tenantId, tenantId),
            inArray(bronzeImportBatches.status, ["pending", "processing"]),
          ),
        )
        .orderBy(desc(bronzeImportBatches.updatedAt))
        .limit(25),
    ]);

    const processes: SystemProcessRow[] = [];

    for (const row of batchRows) {
      const total = Number(row.totalRows ?? 0);
      const processed = Number(row.processedRows ?? 0);
      const progressPercent =
        total > 0 ? Math.max(0, Math.min(100, Math.round((processed / total) * 100))) : null;
      const durationMs = Math.max(0, Date.now() - row.createdAt.getTime());
      const st = row.status === "processing" ? "running" : "queued";
      processes.push({
        id: `import:${row.id}`,
        category: "Imports",
        name: row.filename,
        progressPercent,
        durationMs,
        status: st,
        cancellable: canCancelImport,
        cancel: canCancelImport ? { kind: "import_batch", batchId: row.id } : undefined,
        startedAt: row.createdAt.toISOString(),
        meta: { batchId: row.id, dbStatus: row.status },
      });
    }

    for (const q of queueSnapshots) {
      const name = q.name ?? "";
      if (!name) continue;
      if (queueActivity(q) === 0) continue;
      const cat = categorizeQueue(name);
      if (cat === "Other") continue;
      processes.push({
        id: `queue:${name}`,
        category: cat,
        name,
        progressPercent: null,
        durationMs: null,
        status: queueStatus(q),
        cancellable: false,
        startedAt: null,
        meta: {
          waiting: q.waiting ?? 0,
          active: q.active ?? 0,
          delayed: q.delayed ?? 0,
          failed: q.failed ?? 0,
          completed: q.completed ?? 0,
          paused: q.paused ?? false,
        },
      });
    }

    const activeCount = processes.filter((p) =>
      ["running", "queued", "paused"].includes(p.status),
    ).length;

    return reply.send({
      success: true,
      data: {
        processes,
        activeCount,
        queuesReachable: queuesOk,
      },
      meta: { fetchedAt: Date.now() },
    });
  });
}
