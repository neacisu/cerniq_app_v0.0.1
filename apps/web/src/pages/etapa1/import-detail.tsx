import { useParams, Link } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/index.js";
import {
  useCancelImport,
  useImportDetail,
  useImportEntities,
  useImportReprocessErrors,
  useImportRows,
  useAnafEnrichImport,
  useResumeImportReprocessErrors,
} from "@/hooks/use-etapa1.js";
import { toast } from "@/components/ui/toast-api.js";
import { PipelineProgressPanel } from "@/components/etapa1/PipelineProgressPanel.js";

function getImportProgress(processedRows: number, totalRows: number, status: string) {
  if (totalRows > 0) {
    return Math.round((processedRows / totalRows) * 100);
  }

  return status === "completed" ? 100 : 0;
}

function hasCanonicalizedValue(rawValue: unknown, canonicalValue: unknown) {
  return (
    typeof rawValue === "string" &&
    typeof canonicalValue === "string" &&
    rawValue.length > 0 &&
    canonicalValue.length > 0 &&
    rawValue !== canonicalValue
  );
}

function getIdentityReprocessState(
  metadata: Record<string, unknown>,
): "queued" | "running" | "completed" | "failed" | null {
  const value = String(metadata.identityReprocessStatus ?? "");
  if (value === "queued" || value === "running" || value === "completed" || value === "failed") {
    return value;
  }
  return null;
}

function formatCompactDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}z ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function computeReprocessProgress(processedRows: number, total: number): number {
  if (total <= 0) return 0;
  return processedRows >= total ? 100 : Math.max(0, Math.floor((processedRows / total) * 100));
}

function computeReprocessTiming(metadata: Record<string, unknown>): {
  sessionProcessedBaseRows: number;
  lastProgressAtRaw: string | null;
  hasFreshHeartbeat: boolean;
  elapsedMs: number | null;
  overallElapsedMs: number | null;
} {
  const startedAtRaw =
    typeof metadata.identityReprocessStartedAt === "string"
      ? metadata.identityReprocessStartedAt
      : null;
  const lastProgressAtRaw =
    typeof metadata.identityReprocessLastProgressAt === "string"
      ? metadata.identityReprocessLastProgressAt
      : null;
  const queuedAtRaw =
    typeof metadata.identityReprocessQueuedAt === "string"
      ? metadata.identityReprocessQueuedAt
      : null;
  const sessionStartedAtRaw =
    typeof metadata.identityReprocessSessionStartedAt === "string"
      ? metadata.identityReprocessSessionStartedAt
      : null;
  const startedAt = startedAtRaw ? Date.parse(startedAtRaw) : Number.NaN;
  const queuedAt = queuedAtRaw ? Date.parse(queuedAtRaw) : Number.NaN;
  let sessionStartedAt = startedAt;
  if (sessionStartedAtRaw) {
    sessionStartedAt = Date.parse(sessionStartedAtRaw);
  } else if (Number.isFinite(queuedAt) && (!Number.isFinite(startedAt) || queuedAt > startedAt)) {
    sessionStartedAt = queuedAt;
  }
  const referenceNow = lastProgressAtRaw ? Date.parse(lastProgressAtRaw) : Date.now();
  const elapsedMs =
    Number.isFinite(sessionStartedAt) && referenceNow > sessionStartedAt
      ? referenceNow - sessionStartedAt
      : null;
  const overallElapsedMs =
    Number.isFinite(startedAt) && referenceNow > startedAt ? referenceNow - startedAt : null;
  const heartbeatLagMs = lastProgressAtRaw ? Date.now() - referenceNow : null;
  const hasFreshHeartbeat = heartbeatLagMs === null || heartbeatLagMs <= 60_000;
  const sessionProcessedBaseRows = Math.max(
    0,
    Number(metadata.identityReprocessSessionProcessedBaseRows ?? 0),
  );
  return {
    sessionProcessedBaseRows,
    lastProgressAtRaw,
    hasFreshHeartbeat,
    elapsedMs,
    overallElapsedMs,
  };
}

function getIdentityReprocessMetrics(metadata: Record<string, unknown>, totalRows: number) {
  const state = getIdentityReprocessState(metadata);
  if (!state) {
    return null;
  }

  const processedRows = Number(metadata.identityReprocessProcessedRows ?? 0);
  const resolvedRows = Number(metadata.identityReprocessResolvedRows ?? 0);
  const conflicts = Number(metadata.identityReprocessIdentityConflictRows ?? 0);
  const insufficient = Number(metadata.identityReprocessInsufficientIdentifierRows ?? 0);
  const failedContacts = Number(metadata.identityReprocessFailedContactCount ?? 0);
  const runTotalRows = Number(metadata.identityReprocessRunTotalRows ?? totalRows ?? 0);
  const total = Math.max(runTotalRows, processedRows, 0);
  const progress = computeReprocessProgress(processedRows, total);
  const {
    lastProgressAtRaw,
    hasFreshHeartbeat,
    elapsedMs,
    overallElapsedMs,
    sessionProcessedBaseRows,
  } = computeReprocessTiming(metadata);
  const sessionProcessedRows = Math.max(0, processedRows - sessionProcessedBaseRows);
  const sessionThroughput =
    hasFreshHeartbeat && elapsedMs && sessionProcessedRows > 0
      ? sessionProcessedRows / (elapsedMs / 1000)
      : null;
  const overallThroughput =
    hasFreshHeartbeat && overallElapsedMs && processedRows > 0
      ? processedRows / (overallElapsedMs / 1000)
      : null;
  const throughput = sessionThroughput ?? overallThroughput;
  const remainingRows = total > processedRows ? total - processedRows : 0;
  const etaMs =
    hasFreshHeartbeat && throughput && remainingRows > 0
      ? (remainingRows / throughput) * 1000
      : null;

  return {
    state,
    processedRows,
    resolvedRows,
    conflicts,
    insufficient,
    failedContacts,
    totalRows: total,
    progress,
    throughput,
    etaMs,
    hasFreshHeartbeat,
    lastProgressAtRaw,
  };
}

type ReprocessSummary = {
  tone: string;
  title: string;
  body: string;
  progress: number;
  details: string;
  stats: string;
  lastProgressAt: string | null;
};

type ReprocessMetrics = NonNullable<ReturnType<typeof getIdentityReprocessMetrics>>;

function buildReprocessSummary(
  tone: string,
  title: string,
  body: string,
  details: string,
  stats: string,
  metrics: ReprocessMetrics,
): ReprocessSummary {
  return {
    tone,
    title,
    body,
    progress: metrics.progress,
    details,
    stats,
    lastProgressAt: metrics.lastProgressAtRaw,
  };
}

function getCompletedReprocessSummary(
  metrics: ReprocessMetrics,
  details: string,
  stats: string,
): ReprocessSummary {
  if (metrics.processedRows < metrics.totalRows) {
    const incompleteStats = `${stats} · ${(metrics.totalRows - metrics.processedRows).toLocaleString("ro-RO")} rânduri lipsă`;
    const body = `${metrics.processedRows.toLocaleString("ro-RO")} din ${metrics.totalRows.toLocaleString("ro-RO")} rânduri au fost reevaluate.`;
    return buildReprocessSummary(
      "text-er",
      "Re-rezolvare identitate finalizată incomplet",
      body,
      details,
      incompleteStats,
      metrics,
    );
  }

  const hasErrors = metrics.failedContacts > 0;
  const tone = hasErrors ? "text-er" : "text-ok";
  const title = hasErrors
    ? "Re-rezolvare identitate finalizată cu erori"
    : "Re-rezolvare identitate finalizată";
  const completedStats = hasErrors
    ? `${stats} · ${metrics.failedContacts.toLocaleString("ro-RO")} contacte cu erori`
    : stats;
  return buildReprocessSummary(tone, title, details, details, completedStats, metrics);
}

function getIdentityReprocessSummary(metadata: Record<string, unknown>, totalRows: number) {
  const metrics = getIdentityReprocessMetrics(metadata, totalRows);
  if (!metrics) {
    return null;
  }

  const lastError =
    typeof metadata.identityReprocessLastError === "string"
      ? metadata.identityReprocessLastError
      : null;
  const details = [
    `${metrics.processedRows.toLocaleString("ro-RO")} / ${metrics.totalRows.toLocaleString("ro-RO")} reevaluate`,
    `${metrics.progress}%`,
    metrics.throughput
      ? `~${Math.max(1, Math.round(metrics.throughput)).toLocaleString("ro-RO")} rânduri/s`
      : null,
    metrics.state === "running" && metrics.etaMs
      ? `ETA ${formatCompactDuration(metrics.etaMs)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const stats = `${metrics.resolvedRows.toLocaleString("ro-RO")} rezolvate · ${metrics.conflicts.toLocaleString("ro-RO")} conflicte · ${metrics.insufficient.toLocaleString("ro-RO")} insuficiente`;

  if (metrics.state === "queued") {
    return buildReprocessSummary(
      "text-t2",
      "Re-rezolvare identitate în coadă",
      "Batch-ul așteaptă să fie reevaluat cu noua logică de deduplicare și identity resolution.",
      details,
      stats,
      metrics,
    );
  }

  if (metrics.state === "running") {
    return buildReprocessSummary(
      "text-t2",
      "Re-rezolvare identitate în curs",
      details,
      details,
      stats,
      metrics,
    );
  }

  if (metrics.state === "completed") {
    return getCompletedReprocessSummary(metrics, details, stats);
  }

  return buildReprocessSummary(
    "text-er",
    "Re-rezolvare identitate eșuată",
    lastError ?? "A apărut o eroare la reevaluarea batch-ului.",
    details,
    stats,
    metrics,
  );
}

function ReprocessErrorsTable({ rows }: Readonly<{ rows: Array<Record<string, unknown>> }>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-s700">
            <th className="px-3 py-2 text-left">Rând</th>
            <th className="px-3 py-2 text-left">Denumire</th>
            <th className="px-3 py-2 text-left">Încercări</th>
            <th className="px-3 py-2 text-left">Ultima eroare</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const error = (row.reprocessError as Record<string, unknown> | undefined) ?? {};
            return (
              <tr key={String(row.id)} className="border-b border-s800 last:border-0 align-top">
                <td className="px-3 py-2">{String(row.rowNumber ?? "—")}</td>
                <td className="px-3 py-2">{String(row.extractedName ?? "—")}</td>
                <td className="px-3 py-2">{String(error.attempts ?? 0)}</td>
                <td className="px-3 py-2 break-all text-er">
                  {String(error.lastErrorMessage ?? "—")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getAnafEnrichmentState(metadata: Record<string, unknown>) {
  const status = String(metadata.anafEnrichmentStatus ?? "");
  if (!status) return null;
  const queuedAt =
    typeof metadata.anafEnrichmentQueuedAt === "string" ? metadata.anafEnrichmentQueuedAt : null;
  const completedAt =
    typeof metadata.anafEnrichmentCompletedAt === "string"
      ? metadata.anafEnrichmentCompletedAt
      : null;
  const lastProgressAt =
    typeof metadata.anafEnrichmentLastProgressAt === "string"
      ? metadata.anafEnrichmentLastProgressAt
      : null;
  const totalCuis = Number(metadata.anafEnrichmentTotalCuis ?? 0);
  const totalBatches = Number(metadata.anafEnrichmentTotalBatches ?? 0);
  const processedCuis = Number(metadata.anafEnrichmentProcessedCuis ?? 0);
  const processedBatches = Number(metadata.anafEnrichmentProcessedBatches ?? 0);

  const progress = totalCuis > 0 ? Math.min(100, Math.round((processedCuis / totalCuis) * 100)) : 0;

  const startedAt = queuedAt ? Date.parse(queuedAt) : Number.NaN;
  const referenceNow = lastProgressAt ? Date.parse(lastProgressAt) : Date.now();
  const elapsedMs =
    Number.isFinite(startedAt) && referenceNow > startedAt ? referenceNow - startedAt : null;
  const throughput = elapsedMs && processedCuis > 0 ? processedCuis / (elapsedMs / 1000) : null;
  const remainingCuis = totalCuis > processedCuis ? totalCuis - processedCuis : 0;
  const etaMs = throughput && remainingCuis > 0 ? (remainingCuis / throughput) * 1000 : null;

  return {
    status,
    queuedAt,
    completedAt,
    lastProgressAt,
    totalCuis,
    totalBatches,
    processedCuis,
    processedBatches,
    progress,
    throughput,
    etaMs,
  };
}

function SummaryCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded border border-s700 p-3 text-sm">
      <div className="text-t3">{label}</div>
      <div className="font-semibold text-t1">{value}</div>
    </div>
  );
}

function CanonicalizedBadge() {
  return (
    <span className="ml-2 rounded-full bg-ok/15 px-2 py-0.5 text-[10px] text-ok">canonizat</span>
  );
}

function ImportEntitiesTable({ entities }: Readonly<{ entities: Array<Record<string, unknown>> }>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-s700">
            <th className="px-3 py-2 text-left">Companie</th>
            <th className="px-3 py-2 text-left">CUI</th>
            <th className="px-3 py-2 text-left">Nr. Reg. Com.</th>
            <th className="px-3 py-2 text-left">Status identitate</th>
            <th className="px-3 py-2 text-left">Rânduri sursă</th>
          </tr>
        </thead>
        <tbody>
          {entities.map((entity) => {
            const nrRegComOriginal = entity.nrRegComOriginal;
            const nrRegCom = entity.nrRegCom;
            const isCanonicalized = hasCanonicalizedValue(nrRegComOriginal, nrRegCom);

            return (
              <tr key={String(entity.id)} className="border-b border-s800 last:border-0">
                <td className="px-3 py-2">{String(entity.denumire ?? "—")}</td>
                <td className="px-3 py-2 font-mono">{String(entity.cui ?? "—")}</td>
                <td className="px-3 py-2 font-mono">
                  {String(nrRegComOriginal ?? nrRegCom ?? "—")}
                  {isCanonicalized ? <CanonicalizedBadge /> : null}
                </td>
                <td className="px-3 py-2">{String(entity.identityStatus ?? "—")}</td>
                <td className="px-3 py-2">{String(entity.sourceRows ?? 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ImportRowsTable({ rows }: Readonly<{ rows: Array<Record<string, unknown>> }>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-s700">
            <th className="px-3 py-2 text-left">Rând</th>
            <th className="px-3 py-2 text-left">Denumire</th>
            <th className="px-3 py-2 text-left">CUI</th>
            <th className="px-3 py-2 text-left">Nr. Reg. Com.</th>
            <th className="px-3 py-2 text-left">Status identitate</th>
            <th className="px-3 py-2 text-left">Companie</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowMeta = (row.metadata as Record<string, unknown> | undefined) ?? {};
            const nrRegComRaw = row.nrRegComRaw;
            const nrRegComCanonical = row.nrRegComCanonical;
            const isCanonicalized = hasCanonicalizedValue(nrRegComRaw, nrRegComCanonical);

            return (
              <tr key={String(row.id)} className="border-b border-s800 last:border-0">
                <td className="px-3 py-2">{String(rowMeta.rowNumber ?? "—")}</td>
                <td className="px-3 py-2">{String(row.extractedName ?? "—")}</td>
                <td className="px-3 py-2 font-mono">
                  {String(row.cuiRaw ?? row.cuiCanonical ?? "—")}
                </td>
                <td className="px-3 py-2 font-mono">
                  {String(nrRegComRaw ?? nrRegComCanonical ?? "—")}
                  {isCanonicalized ? <CanonicalizedBadge /> : null}
                </td>
                <td className="px-3 py-2">{String(row.identityStatus ?? "—")}</td>
                <td className="px-3 py-2 font-mono">{String(row.resolvedCompanyId ?? "—")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AnafStatusCard({
  anafState,
}: Readonly<{ anafState: ReturnType<typeof getAnafEnrichmentState> }>) {
  if (!anafState) return null;
  const isProcessing = anafState.status === "processing";
  const isCompleted = anafState.status === "completed";

  const details = [
    anafState.totalCuis > 0
      ? `${anafState.processedCuis.toLocaleString("ro-RO")} / ${anafState.totalCuis.toLocaleString("ro-RO")} CUI-uri`
      : null,
    anafState.totalBatches > 0
      ? `batch ${anafState.processedBatches} / ${anafState.totalBatches}`
      : null,
    anafState.throughput && isProcessing
      ? `~${Math.max(1, Math.round(anafState.throughput)).toLocaleString("ro-RO")} CUI-uri/s`
      : null,
    anafState.etaMs && isProcessing ? `ETA ${formatCompactDuration(anafState.etaMs)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mb-4 rounded-lg border border-s700 bg-s800/40 p-3 text-sm">
      <div className={`font-semibold ${isCompleted ? "text-ok" : "text-t2"}`}>
        {isCompleted ? "Îmbogățire ANAF finalizată" : "Îmbogățire ANAF în curs"}
      </div>
      {details ? <div className="mt-1 text-t2">{details}</div> : null}
      <div className="mt-3">
        <ProgressBar
          value={anafState.progress}
          indeterminate={isProcessing && anafState.progress <= 0}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-t3">
        {anafState.queuedAt ? (
          <span>Trimis la: {new Date(anafState.queuedAt).toLocaleString()}</span>
        ) : null}
        {anafState.completedAt ? (
          <span>Finalizat la: {new Date(anafState.completedAt).toLocaleString()}</span>
        ) : null}
        {anafState.lastProgressAt && isProcessing ? (
          <span>Heartbeat: {new Date(anafState.lastProgressAt).toLocaleString()}</span>
        ) : null}
      </div>
    </div>
  );
}

function ImportErrorCard({
  lastError,
  failedAt,
}: Readonly<{ lastError: string | null; failedAt: string | null }>) {
  if (!lastError) return null;
  return (
    <div className="mb-4 rounded-lg border border-er/30 bg-er/10 p-3 text-sm text-er">
      <div className="font-semibold">Ultima eroare de import</div>
      <div className="mt-1 wrap-break-word">{lastError}</div>
      {failedAt ? (
        <div className="mt-1 text-xs opacity-80">
          Marcat ca eșuat la {new Date(failedAt).toLocaleString()}
        </div>
      ) : null}
    </div>
  );
}

function IdentityReprocessCard({
  summary,
}: Readonly<{ summary: ReturnType<typeof getIdentityReprocessSummary> }>) {
  if (!summary) return null;
  return (
    <div className="mb-4 rounded-lg border border-s700 bg-s800/40 p-3 text-sm">
      <div className={`font-semibold ${summary.tone}`}>{summary.title}</div>
      <div className="mt-1 text-t2">{summary.body}</div>
      <div className="mt-3">
        <ProgressBar value={summary.progress} indeterminate={summary.progress <= 0} />
      </div>
      <div className="mt-2 text-xs text-t3">{summary.stats}</div>
      {summary.lastProgressAt ? (
        <div className="mt-1 text-xs text-t3">
          Ultimul heartbeat: {new Date(summary.lastProgressAt).toLocaleString()}
        </div>
      ) : null}
    </div>
  );
}

async function cancelImport(
  id: string,
  cancelMutation: ReturnType<typeof useCancelImport>,
  refetch: () => Promise<unknown>,
) {
  try {
    await cancelMutation.mutateAsync(id);
    toast.success("Import anulat");
    await refetch();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Eroare la anularea importului");
  }
}

async function triggerAnafEnrich(
  id: string,
  anafEnrichMutation: ReturnType<typeof useAnafEnrichImport>,
  refetch: () => Promise<unknown>,
) {
  try {
    const result = await anafEnrichMutation.mutateAsync(id);
    const data = result?.data as Record<string, unknown> | undefined;
    const queued = Number(data?.queued ?? 0);
    const message =
      queued === 0
        ? "Toate contactele au fost deja îmbogățite ANAF"
        : `${queued} CUI-uri trimise la ANAF pentru îmbogățire`;
    toast.success(message);
    await refetch();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Eroare la trimiterea către ANAF");
  }
}

async function resumeReprocessErrors(
  id: string,
  resumeErrorsMutation: ReturnType<typeof useResumeImportReprocessErrors>,
  refetchDetail: () => Promise<unknown>,
  refetchErrors: () => Promise<unknown>,
) {
  try {
    const result = await resumeErrorsMutation.mutateAsync(id);
    const data = result?.data as Record<string, unknown> | undefined;
    toast.success(
      `${Number(data?.requeued ?? 0).toLocaleString("ro-RO")} contacte cu erori au fost trimise la reprocess separat.`,
    );
    await refetchDetail();
    await refetchErrors();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Eroare la reluarea contactelor cu erori");
  }
}

function ImportDetailActions({
  id,
  isCompleted,
  canCancel,
  anafState,
  anafEnrichMutation,
  cancelMutation,
  refetch,
}: Readonly<{
  id: string;
  isCompleted: boolean;
  canCancel: boolean;
  anafState: ReturnType<typeof getAnafEnrichmentState>;
  anafEnrichMutation: ReturnType<typeof useAnafEnrichImport>;
  cancelMutation: ReturnType<typeof useCancelImport>;
  refetch: () => Promise<unknown>;
}>) {
  return (
    <div className="flex gap-2">
      {id ? (
        <Link
          to={`/etapa1/bronze?batchId=${id}`}
          className="inline-flex items-center justify-center rounded-md border border-s600 bg-transparent px-3 py-1.5 text-sm font-medium text-t1 hover:bg-s700"
        >
          Vezi contacte Bronze
        </Link>
      ) : null}
      {isCompleted ? (
        <Button
          variant="outline"
          onClick={() => triggerAnafEnrich(id, anafEnrichMutation, refetch)}
          disabled={anafEnrichMutation.isPending || anafState?.status === "processing"}
        >
          {anafEnrichMutation.isPending ? "Se trimite..." : "Prelucreaza ANAF"}
        </Button>
      ) : null}
      {canCancel ? (
        <Button
          variant="danger"
          onClick={() => cancelImport(id, cancelMutation, refetch)}
          disabled={cancelMutation.isPending}
        >
          {cancelMutation.isPending ? "Se anuleaza..." : "Anuleaza Import"}
        </Button>
      ) : null}
    </div>
  );
}

function FailedReprocessCard({
  failedCount,
  isPending,
  onResume,
}: Readonly<{ failedCount: number; isPending: boolean; onResume: () => void }>) {
  if (failedCount <= 0) return null;
  return (
    <div className="mb-4 rounded-lg border border-er/30 bg-er/8 p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-er">Contacte cu erori la reprocess</div>
          <div className="mt-1 text-t2">
            {failedCount.toLocaleString("ro-RO")} contacte au eșuat după 3 încercări locale și pot
            fi reluate separat.
          </div>
        </div>
        <Button variant="outline" onClick={onResume} disabled={isPending}>
          {isPending ? "Se reia..." : "Resume erori"}
        </Button>
      </div>
    </div>
  );
}

export function ImportDetail() {
  const { id } = useParams();
  const detailQuery = useImportDetail(id);
  const entitiesQuery = useImportEntities(id, 100, 0);
  const rowsQuery = useImportRows(id, 100, 0);
  const reprocessErrorsQuery = useImportReprocessErrors(id, 100, 0);
  const cancelMutation = useCancelImport();
  const anafEnrichMutation = useAnafEnrichImport();
  const resumeErrorsMutation = useResumeImportReprocessErrors();

  if (detailQuery.isPending) {
    return (
      <PageWrapper title="Import Detail">
        <div className="flex items-center justify-center py-12">
          <Spinner size={32} />
        </div>
      </PageWrapper>
    );
  }

  if (detailQuery.isError) {
    return (
      <PageWrapper title="Import Detail">
        <div className="rounded-lg border border-er/30 bg-er/10 p-4 text-sm text-er">
          Eroare la încărcarea datelor: {detailQuery.error?.message ?? "Eroare necunoscută"}
        </div>
      </PageWrapper>
    );
  }

  const item = detailQuery.data?.data ?? {};
  const metadata = (item.metadata as Record<string, unknown> | undefined) ?? {};
  const uploadConfig = (metadata.uploadConfig as Record<string, unknown> | undefined) ?? {};
  const identitySummary = (item.identitySummary as Record<string, unknown> | undefined) ?? {};
  const status = String(item.status ?? "unknown");
  const canCancel = status === "pending" || status === "processing";
  const isCompleted = status === "completed";
  const processedRows = Number(item.processedRows ?? 0);
  const totalRows = Number(item.totalRows ?? 0);
  const hasKnownTotal = totalRows > 0;
  const progress = getImportProgress(processedRows, totalRows, status);
  const lastProgressAt =
    typeof metadata.lastProgressAt === "string" ? metadata.lastProgressAt : null;
  const lastError = typeof metadata.lastError === "string" ? metadata.lastError : null;
  const failedAt = typeof metadata.failedAt === "string" ? metadata.failedAt : null;
  const rowsLabel = hasKnownTotal
    ? `${processedRows} / ${totalRows}`
    : `${processedRows} procesate până acum`;
  const identityReprocessSummary = getIdentityReprocessSummary(metadata, totalRows);
  const failedReprocessContacts = Number(metadata.identityReprocessFailedContactCount ?? 0);
  const anafState = getAnafEnrichmentState(metadata);

  return (
    <PageWrapper
      title="Import Detail"
      actions={
        id ? (
          <ImportDetailActions
            id={id}
            isCompleted={isCompleted}
            canCancel={canCancel}
            anafState={anafState}
            anafEnrichMutation={anafEnrichMutation}
            cancelMutation={cancelMutation}
            refetch={() => detailQuery.refetch()}
          />
        ) : null
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>{String(item.filename ?? id ?? "-")}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <SummaryCard label="Status" value={status} />
            <SummaryCard label="Randuri" value={rowsLabel} />
            <SummaryCard label="Progres" value={`${progress}%`} />
            <SummaryCard
              label="Entități rezolvate"
              value={Number(identitySummary.resolvedCompanies ?? 0).toLocaleString("ro-RO")}
            />
            <SummaryCard
              label="Conflicte identitate"
              value={Number(identitySummary.identityConflictRows ?? 0).toLocaleString("ro-RO")}
            />
            <SummaryCard
              label="Rânduri insuficiente"
              value={Number(identitySummary.insufficientIdentifierRows ?? 0).toLocaleString(
                "ro-RO",
              )}
            />
          </div>

          <div className="mb-4">
            <ProgressBar
              value={progress}
              indeterminate={status === "processing" && !hasKnownTotal}
            />
            {lastProgressAt ? (
              <p className="mt-2 text-xs text-t3">
                Ultimul progres: {new Date(lastProgressAt).toLocaleString()}
              </p>
            ) : null}
          </div>

          <ImportErrorCard lastError={lastError} failedAt={failedAt} />

          <IdentityReprocessCard summary={identityReprocessSummary} />

          <FailedReprocessCard
            failedCount={failedReprocessContacts}
            isPending={resumeErrorsMutation.isPending}
            onResume={() => {
              if (id) {
                resumeReprocessErrors(
                  id,
                  resumeErrorsMutation,
                  () => detailQuery.refetch(),
                  () => reprocessErrorsQuery.refetch(),
                );
              }
            }}
          />

          <AnafStatusCard anafState={anafState} />

          <Tabs defaultValue="entities">
            <TabsList>
              <TabsTrigger value="entities">Entități</TabsTrigger>
              <TabsTrigger value="rows">Rânduri brute</TabsTrigger>
              <TabsTrigger value="reprocess-errors">Erori reprocess</TabsTrigger>
              <TabsTrigger value="pipeline-logs">Progres pipeline</TabsTrigger>
              <TabsTrigger value="config">Config</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="raw">Raw</TabsTrigger>
            </TabsList>
            <TabsContent value="entities">
              {entitiesQuery.isPending ? (
                <div className="flex justify-center py-6">
                  <Spinner size={24} />
                </div>
              ) : (
                <ImportEntitiesTable entities={entitiesQuery.data?.data ?? []} />
              )}
            </TabsContent>
            <TabsContent value="rows">
              {rowsQuery.isPending ? (
                <div className="flex justify-center py-6">
                  <Spinner size={24} />
                </div>
              ) : (
                <ImportRowsTable rows={rowsQuery.data?.data ?? []} />
              )}
            </TabsContent>
            <TabsContent value="reprocess-errors">
              {reprocessErrorsQuery.isPending ? (
                <div className="flex justify-center py-6">
                  <Spinner size={24} />
                </div>
              ) : (
                <ReprocessErrorsTable rows={reprocessErrorsQuery.data?.data ?? []} />
              )}
            </TabsContent>
            <TabsContent value="pipeline-logs">
              {id ? (
                <PipelineProgressPanel
                  batchId={id}
                  isActive={status === "pending" || status === "processing"}
                />
              ) : null}
            </TabsContent>
            <TabsContent value="config">
              <pre className="text-xs text-t2">{JSON.stringify(uploadConfig, null, 2)}</pre>
            </TabsContent>
            <TabsContent value="metadata">
              <pre className="text-xs text-t2">{JSON.stringify(metadata, null, 2)}</pre>
            </TabsContent>
            <TabsContent value="raw">
              <pre className="text-xs text-t2">{JSON.stringify(item, null, 2)}</pre>
            </TabsContent>
          </Tabs>
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
