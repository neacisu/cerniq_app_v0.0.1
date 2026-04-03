import { Link, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { Card, CardHeader, CardTitle, CardBody, SBadge } from "@/components/ui/index.js";
import { Button } from "@/components/ui/button.js";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils.js";
import { api, ApiError } from "@/lib/api.js";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider.js";
import { isAdminLikeRole } from "@/lib/auth-roles.js";

type QueueRow = {
  name?: string;
  waiting?: number;
  active?: number;
  completed?: number;
  failed?: number;
  delayed?: number;
  paused?: boolean;
};

type LiveResponse = {
  success?: boolean;
  data?: {
    timestamp?: number;
    queues?: QueueRow[];
    system?: Record<string, unknown> | null;
  };
  error?: string;
};

function queueStatus(q: QueueRow): "ok" | "warning" | "error" {
  const failed = q.failed ?? 0;
  if (failed > 0) return "warning";
  if (q.paused) return "warning";
  return "ok";
}

const statusLabel = { ok: "ACTIVE", warning: "PAUSED", error: "FAILED" } as const;

export function Workers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const liveQuery = useQuery({
    queryKey: ["admin", "live"],
    queryFn: () => api.get<LiveResponse>("/api/admin/live"),
    refetchInterval: 15_000,
    enabled: isAdminLikeRole(user?.role),
  });

  if (!isAdminLikeRole(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const data = liveQuery.data?.data;
  const queues = Array.isArray(data?.queues) ? data.queues : [];
  const sys = data?.system;

  const totalWaiting = queues.reduce((a, q) => a + (q.waiting ?? 0), 0);
  const totalActive = queues.reduce((a, q) => a + (q.active ?? 0), 0);
  const totalFailed = queues.reduce((a, q) => a + (q.failed ?? 0), 0);

  const errorMsg =
    liveQuery.error instanceof ApiError
      ? liveQuery.error.message
      : liveQuery.error instanceof Error
        ? liveQuery.error.message
        : liveQuery.data?.success === false
          ? String(liveQuery.data?.error ?? "Eroare")
          : null;

  async function queueAction(name: string, action: "pause" | "resume") {
    try {
      await api.post(`/api/admin/queues/${encodeURIComponent(name)}/${action}`);
      toast.success(`Coadă ${name}: ${action}`);
      await qc.invalidateQueries({ queryKey: ["admin", "live"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Acțiune eșuată");
    }
  }

  return (
    <PageWrapper title="Workers / Infrastructure">
      {errorMsg ? (
        <p className="text-sm text-er mb-4" role="alert">
          Monitoring indisponibil sau fără permisiuni admin: {errorMsg}
        </p>
      ) : null}

      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <KpiCard label="Cozi" value={String(queues.length)} icon="Server" delay={0} />
        <KpiCard label="Waiting" value={String(totalWaiting)} icon="Layers" delay={80} />
        <KpiCard label="Active" value={String(totalActive)} icon="CheckCircle" delay={160} />
        <KpiCard label="Failed" value={String(totalFailed)} icon="XCircle" delay={240} />
      </div>

      {sys && typeof sys === "object" ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Sistem (Monitoring)</CardTitle>
          </CardHeader>
          <CardBody>
            <pre className="text-xs text-t3 overflow-x-auto max-h-40">
              {JSON.stringify(sys, null, 2)}
            </pre>
          </CardBody>
        </Card>
      ) : null}

      <div className="mb-6">
        <Link to="/brain">
          <Button
            variant="outline"
            className="flex items-center gap-2 border-[var(--color-neuron-executive)] text-[var(--color-neuron-executive)] hover:bg-[var(--color-neuron-executive)]/10"
          >
            <Brain size={16} />
            Vizualizare Cognitive Brain
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>BullMQ — cozi ({queues.length})</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {liveQuery.isLoading ? (
            <p className="p-5 text-t3 text-sm">Se încarcă datele din Monitoring…</p>
          ) : queues.length === 0 ? (
            <p className="p-5 text-t3 text-sm">
              Nicio coadă returnată. Verificați Monitoring API sau drepturile de admin.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-s700 text-left text-t3">
                  <th className="px-5 py-3">Coadă</th>
                  <th className="px-5 py-3">Waiting</th>
                  <th className="px-5 py-3">Active</th>
                  <th className="px-5 py-3">Completed</th>
                  <th className="px-5 py-3">Failed</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {queues.map((q, i) => {
                  const name = q.name ?? "—";
                  const st = queueStatus(q);
                  return (
                    <tr
                      key={name + String(i)}
                      className={cn(
                        "border-b border-s700 last:border-0 hover:bg-s800/50",
                        i % 2 === 1 && "bg-s800/30",
                      )}
                    >
                      <td className="px-5 py-3 font-medium text-t1">{name}</td>
                      <td className="px-5 py-3 text-t2">{q.waiting ?? 0}</td>
                      <td className="px-5 py-3 text-t2">{q.active ?? 0}</td>
                      <td className="px-5 py-3 text-t2">{q.completed ?? 0}</td>
                      <td className="px-5 py-3 text-t2">{q.failed ?? 0}</td>
                      <td className="px-5 py-3">
                        <SBadge status={statusLabel[st]} />
                      </td>
                      <td className="px-5 py-3 flex gap-2 flex-wrap">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={q.paused === true}
                          onClick={() => void queueAction(name, "pause")}
                        >
                          Pause
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={q.paused !== true}
                          onClick={() => void queueAction(name, "resume")}
                        >
                          Resume
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
