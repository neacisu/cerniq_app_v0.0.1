import { Link, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useState, type ReactNode } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { Card, CardHeader, CardTitle, CardBody, SBadge } from "@/components/ui/index.js";
import { Button } from "@/components/ui/button.js";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils.js";
import { ApiError } from "@/lib/api.js";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider.js";
import { isAdminLikeRole } from "@/lib/auth-roles.js";
import {
  fetchAdminLive,
  fetchQueueDetail,
  postQueueControl,
  type LiveResponse,
  type QueueRow,
} from "./workers-fetch.js";

/** Texte UI în constante (fără `>` ambigue lângă markup în același fișier). */
const COPY_QUEUE_DETAIL_HEADING = "Detaliu coadă (GET /api/admin/queues/:name)";
const COPY_SYSTEM_CARD_TITLE = "Sistem (GET /api/admin/live → system, din /api/system/metrics)";
const COPY_BULLMQ_CARD_TITLE = "BullMQ — cozi (live + POST control)";

function queueStatusLabel(q: QueueRow): "ACTIVE" | "PAUSED" | "FAILED" {
  if ((q.failed ?? 0) > 0) return "FAILED";
  if (q.paused) return "PAUSED";
  return "ACTIVE";
}

function formatQueueSnapshot(d: QueueRow | undefined): string {
  if (!d) return "";
  const w = d.waiting ?? 0;
  const a = d.active ?? 0;
  const f = d.failed ?? 0;
  let extras = "";
  if (typeof d.throughput === "number") extras += ` thr=${d.throughput}`;
  if (typeof d.latency === "number") extras += ` lat=${d.latency}ms`;
  return `waiting=${w} active=${a} failed=${f}${extras}`;
}

function monitoringUserMessage(error: unknown, liveBody?: LiveResponse): string {
  if (error instanceof ApiError) {
    const raw = error.data;
    if (raw && typeof raw === "object" && "error" in raw) {
      return String((raw as { error: unknown }).error);
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  if (liveBody?.success === false && liveBody.error) return String(liveBody.error);
  return "Eroare necunoscută";
}

function QueueDetailInner({
  isLoading,
  err,
  data,
}: {
  readonly isLoading: boolean;
  readonly err: string | null;
  readonly data: QueueRow | undefined;
}) {
  if (isLoading) return <span>Se încarcă…</span>;
  if (err) return <span className="text-er">{err}</span>;
  if (data) {
    return (
      <pre className="whitespace-pre-wrap font-mono text-[11px]">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }
  return <span>Fără date.</span>;
}

function QueueDetailRow({
  queueName,
  onClose,
}: {
  readonly queueName: string;
  readonly onClose: () => void;
}) {
  const detailQuery = useQuery({
    queryKey: ["admin", "queues", queueName],
    queryFn: () => fetchQueueDetail(queueName),
    enabled: queueName.length > 0,
  });

  const err = detailQuery.error instanceof ApiError ? detailQuery.error.message : null;

  return (
    <tr className="bg-s900/40">
      <td colSpan={8} className="px-5 py-4 text-xs text-t3 border-b border-s700">
        <div className="flex justify-between items-start gap-4">
          <div>
            <div className="text-t2 font-medium mb-1">{COPY_QUEUE_DETAIL_HEADING}</div>
            <QueueDetailInner
              isLoading={detailQuery.isLoading}
              err={err}
              data={detailQuery.data?.data}
            />
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            Închide
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function Workers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [expandedQueue, setExpandedQueue] = useState<string | null>(null);

  const liveQuery = useQuery({
    queryKey: ["admin", "live"],
    queryFn: fetchAdminLive,
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
    liveQuery.isError || liveQuery.data?.success === false
      ? monitoringUserMessage(liveQuery.error, liveQuery.data)
      : null;

  async function queueControlAction(
    name: string,
    action: "pause" | "resume" | "retry-failed" | "drain",
  ) {
    if (action === "drain") {
      const ok = globalThis.window?.confirm(
        `Confirmați GOLIREA completă a cozii „${name}”? Joburile așteptând vor fi eliminate (drain). Acțiune ireversibilă.`,
      );
      if (!ok) return;
    }
    try {
      const res = await postQueueControl(name, action);
      const snap = res?.data;
      const detail = formatQueueSnapshot(snap);
      let toastMsg = `${name}: ${action} — ${JSON.stringify(res ?? {})}`;
      if (detail) toastMsg = `${name}: ${action} — ${detail}`;
      toast.success(toastMsg);
      await qc.invalidateQueries({ queryKey: ["admin", "live"] });
      await qc.invalidateQueries({ queryKey: ["admin", "queues", name] });
    } catch (e) {
      const msg = monitoringUserMessage(e);
      toast.error(msg);
    }
  }

  let queuesPanel: ReactNode;
  if (liveQuery.isLoading) {
    queuesPanel = <p className="p-5 text-t3 text-sm">Se încarcă datele din GET /api/admin/live…</p>;
  } else if (queues.length === 0) {
    queuesPanel = (
      <p className="p-5 text-t3 text-sm">
        Nicio coadă returnată. Verificați Monitoring API, ADMIN_KEY pe API și drepturile de admin.
      </p>
    );
  } else {
    queuesPanel = (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-s700 text-left text-t3">
            <th className="px-5 py-3">Coadă</th>
            <th className="px-5 py-3">Waiting</th>
            <th className="px-5 py-3">Active</th>
            <th className="px-5 py-3">Completed</th>
            <th className="px-5 py-3">Failed</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Detaliu</th>
            <th className="px-5 py-3">Acțiuni</th>
          </tr>
        </thead>
        <tbody>
          {queues.map((q, i) => {
            const name = q.name ?? "—";
            const st = queueStatusLabel(q);
            const isOpen = expandedQueue === name;
            return (
              <Fragment key={`${name}-${i}`}>
                <tr
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
                    <SBadge status={st} />
                  </td>
                  <td className="px-5 py-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setExpandedQueue(isOpen ? null : name)}
                    >
                      {isOpen ? "Ascunde" : "Detalii"}
                    </Button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={q.paused === true}
                        onClick={() => void queueControlAction(name, "pause")}
                      >
                        Pauză
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={q.paused !== true}
                        onClick={() => void queueControlAction(name, "resume")}
                      >
                        Reia
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={(q.failed ?? 0) <= 0}
                        onClick={() => void queueControlAction(name, "retry-failed")}
                      >
                        Reîncearcă eșuate
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        className="text-xs"
                        onClick={() => void queueControlAction(name, "drain")}
                      >
                        Drain
                      </Button>
                    </div>
                  </td>
                </tr>
                {isOpen ? (
                  <QueueDetailRow queueName={name} onClose={() => setExpandedQueue(null)} />
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <PageWrapper title="Workers / Infrastructure">
      {errorMsg ? (
        <p className="text-sm text-er mb-4" role="alert">
          Monitoring indisponibil (502), interzis (403) sau altă eroare: {errorMsg}
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
            <CardTitle>{COPY_SYSTEM_CARD_TITLE}</CardTitle>
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
          <CardTitle>{COPY_BULLMQ_CARD_TITLE}</CardTitle>
        </CardHeader>
        <CardBody className="p-0">{queuesPanel}</CardBody>
      </Card>
    </PageWrapper>
  );
}
