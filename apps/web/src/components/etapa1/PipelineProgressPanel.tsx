import { useMemo, useState } from "react";
import { Spinner } from "@/components/ui/spinner.js";
import { Badge } from "@/components/ui/badge.js";
import { Select } from "@/components/ui/select.js";
import { Input } from "@/components/ui/input.js";
import { Button } from "@/components/ui/button.js";
import { toast } from "@/components/ui/toast-api.js";
import { resolveEffectiveSessionId } from "@/components/etapa1/pipeline-session.js";
import {
  useImportJobLogs,
  usePauseImportBatch,
  usePauseImportWorker,
  useImportPipelineStatus,
  useImportRuntimeTopology,
  useResumeImportBatch,
  useResumeImportWorker,
} from "@/hooks/use-etapa1.js";
import type {
  ImportAnafProgress,
  ImportAttemptSummary,
  ImportPipelineStatus,
  ImportPromotionMetrics,
  ImportRuntimeJob,
  ImportRuntimeTopology,
  ImportRuntimeWorker,
  JobLog,
  JobLogLevel,
} from "@/lib/etapa1-api.js";
import { cn } from "@/lib/utils.js";

type Props = {
  batchId: string;
  isActive: boolean;
};

const LEVEL_BADGE_VARIANT: Record<JobLogLevel, "brand" | "info" | "warning" | "error"> = {
  step: "brand",
  info: "info",
  warn: "warning",
  error: "error",
};

const LEVEL_ROW_CLASS: Record<JobLogLevel, string> = {
  step: "border-l-2 border-violet-400 bg-violet-50/40",
  info: "border-l-2 border-sky-300 bg-transparent",
  warn: "border-l-2 border-amber-400 bg-amber-50/40",
  error: "border-l-2 border-red-500 bg-red-50/50",
};

const LEVEL_OPTIONS = [
  { value: "", label: "Toate nivelele" },
  { value: "step", label: "Pași principali" },
  { value: "info", label: "Info" },
  { value: "warn", label: "Avertismente" },
  { value: "error", label: "Erori" },
];

const STATE_BADGE: Record<
  string,
  { label: string; variant: "brand" | "info" | "warning" | "error" }
> = {
  active: { label: "ACTIVE", variant: "brand" },
  waiting: { label: "WAITING", variant: "info" },
  wait: { label: "WAITING", variant: "info" },
  delayed: { label: "DELAYED", variant: "warning" },
  prioritized: { label: "PRIORITY", variant: "brand" },
  failed: { label: "FAILED", variant: "error" },
  error: { label: "ERROR", variant: "error" },
  completed: { label: "DONE", variant: "info" },
  warning: { label: "WARN", variant: "warning" },
  running: { label: "RUNNING", variant: "brand" },
  seen: { label: "SEEN", variant: "info" },
  unknown: { label: "UNKNOWN", variant: "warning" },
};

const EMPTY_RUNTIME_WORKERS: ImportRuntimeWorker[] = [];
const ACTIONABLE_RUNTIME_STATES = new Set(["failed", "stale", "terminal_error_skipped"]);

function formatTs(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatRelativeShort(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const diffMs = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diffMs) || diffMs < 0) return null;
  const seconds = Math.round(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}z`;
}

function shortId(value: string | null | undefined): string {
  if (!value) return "-";
  return value.length > 14 ? `…${value.slice(-10)}` : value;
}

function formatProgress(progress: number | null | undefined): string | null {
  return typeof progress === "number" ? `${Math.max(0, Math.min(100, progress))}%` : null;
}

function formatOptionalDuration(durationMs: number | null | undefined): string | null {
  return typeof durationMs === "number" ? `${durationMs}ms` : null;
}

function formatNumber(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString("ro-RO");
}

function formatRate(value: number | null | undefined): string | null {
  return typeof value === "number" && Number.isFinite(value)
    ? `~${Math.max(1, Math.round(value)).toLocaleString("ro-RO")} /s`
    : null;
}

function resolveEntityLabel(entityType: string | null | undefined): string | null {
  if (entityType === "company") return "company";
  if (entityType === "bronze_contact") return "contact";
  return entityType || null;
}

function matchesSearch(job: ImportRuntimeJob, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [
    job.workerName,
    job.queueName,
    job.jobId,
    job.bronzeContactId,
    job.entityId,
    job.entityType,
    job.correlationId,
    job.step,
    job.message,
    job.state,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalized);
}

function jobMatchesLevel(job: ImportRuntimeJob, level: string): boolean {
  if (!level) return true;
  return job.level === level;
}

/**
 * Returns the accessible label for Resume/Recover buttons.
 * Extracted to avoid nested ternaries in JSX (S3358).
 */
function resolveResumeLabel(isBusy: boolean, needsRecover: boolean, baseLabel: string): string {
  if (isBusy) return "\u2026";
  return needsRecover ? `${baseLabel} + Recover` : baseLabel;
}

/**
 * Maps an ANAF enrichment state to a Tailwind tone class.
 * Extracted to avoid nested ternaries in JSX (S3358).
 */
function resolveAnafStateTone(state: string): string {
  if (state === "failed") return "text-er";
  if (state === "paused") return "text-wa";
  return "text-t1";
}

/**
 * Builds the human-readable hint string for the Reprocess OverviewCard.
 * Extracted to avoid nested ternaries in JSX (S3358).
 */
function resolveReprocessHint(reprocess: ImportPipelineStatus["reprocessJob"]): string {
  if (!reprocess) return "Nu exista un batch reprocess raportat acum";
  if (reprocess.counterDrift) {
    return `Contor inconsistent: ${reprocess.processed.toLocaleString("ro-RO")} raportate la ${reprocess.total.toLocaleString("ro-RO")} rânduri Bronze`;
  }
  return `${reprocess.processed.toLocaleString("ro-RO")} / ${reprocess.total.toLocaleString("ro-RO")} rânduri Bronze · ${reprocess.promotionQueued.toLocaleString("ro-RO")} promotion queued`;
}

function OverviewCard({
  label,
  value,
  hint,
  tone = "text-t1",
}: Readonly<{ label: string; value: string; hint?: string; tone?: string }>) {
  return (
    <div className="rounded-lg border border-s700/60 bg-surface-2 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-t3">{label}</div>
      <div className={cn("mt-1 text-sm font-semibold", tone)}>{value}</div>
      {hint ? <div className="mt-1 text-[11px] leading-relaxed text-t3">{hint}</div> : null}
    </div>
  );
}

function ErrorSummaryPanel({ logs, total }: Readonly<{ logs: JobLog[]; total: number }>) {
  const errors = logs.filter((log) => log.level === "error").slice(0, 8);
  if (errors.length === 0) return null;
  return (
    <div className="rounded-md border border-er/30 bg-er/8 px-3 py-2 space-y-1.5">
      <p className="text-[11px] font-semibold text-er">
        {total} {total === 1 ? "eroare" : "erori"} detectate in logurile recente
      </p>
      <div className="space-y-1 max-h-56 overflow-y-auto">
        {errors.map((log) => (
          <div key={log.id} className="rounded-sm border border-er/20 bg-er/5 px-2 py-1.5">
            <div className="flex flex-wrap items-start gap-1.5">
              <span className="tabular-nums text-[9px] text-t3">{formatTs(log.createdAt)}</span>
              <span className="rounded bg-surface-3 px-1 font-mono text-[9px] text-t3">
                {log.workerName}
              </span>
              <span className="text-[9px] text-t3">[{log.step}]</span>
              <span className="flex-1 text-[10px] font-medium leading-snug text-er">
                {log.message}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineRow({ log }: Readonly<{ log: JobLog }>) {
  const [expanded, setExpanded] = useState(log.level === "error");
  const hasDetails = Boolean(log.details && Object.keys(log.details).length > 0);
  const durationLabel = formatOptionalDuration(log.durationMs);

  return (
    <div className={cn("rounded-sm mb-0.5 pl-3 pr-2 py-1.5", LEVEL_ROW_CLASS[log.level])}>
      <div className="flex items-start gap-2">
        <span className="w-16 shrink-0 tabular-nums text-[10px] text-t3">
          {formatTs(log.createdAt)}
        </span>
        <Badge variant={LEVEL_BADGE_VARIANT[log.level]}>{log.level.toUpperCase()}</Badge>
        <span className="shrink-0 rounded bg-surface-3 px-1 text-[10px] text-t3">
          {log.workerName}
        </span>
        {log.jobId ? (
          <span className="shrink-0 font-mono text-[10px] text-t3">{shortId(log.jobId)}</span>
        ) : null}
        <span className="shrink-0 text-[10px] text-t3">[{log.step}]</span>
        <span className="flex-1 text-xs leading-snug text-t1">
          {log.message}
          {durationLabel ? (
            <span className="ml-2 text-[10px] text-t3">({durationLabel})</span>
          ) : null}
        </span>
        {hasDetails ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="shrink-0 text-[10px] text-sky-500 underline"
          >
            {expanded ? "ascunde" : "detalii"}
          </button>
        ) : null}
      </div>
      {expanded && hasDetails ? (
        <pre className="mt-1.5 ml-16 max-h-48 overflow-x-auto rounded bg-surface-3 p-2 text-[10px] text-t2">
          {JSON.stringify(log.details, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function RuntimeJobCard({ job }: Readonly<{ job: ImportRuntimeJob }>) {
  const badge = STATE_BADGE[job.state] ?? STATE_BADGE.unknown;
  const progress = formatProgress(job.progress);
  const relative = formatRelativeShort(job.lastEventAt ?? job.createdAt);
  const entityLabel = resolveEntityLabel(job.entityType);
  const durationLabel = formatOptionalDuration(job.durationMs);

  return (
    <div className="rounded-md border border-s700/60 bg-s700/20 px-3 py-2 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={badge.variant}>{badge.label}</Badge>
        <span className="rounded bg-s700 px-1.5 py-0.5 font-mono text-[10px] text-t3">
          {job.jobId ? shortId(job.jobId) : "fara jobId"}
        </span>
        {job.entityId ? (
          <span className="font-mono text-[10px] text-t3">
            {entityLabel ?? "entity"} {shortId(job.entityId)}
          </span>
        ) : null}
        {progress ? <span className="text-[10px] font-medium text-sky-600">{progress}</span> : null}
        <span className="ml-auto text-[10px] text-t3">
          {formatTs(job.lastEventAt ?? job.createdAt)}
          {relative ? ` · acum ${relative}` : ""}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        <span className="font-medium text-t1">{job.step ? `[${job.step}]` : "[live]"}</span>
        <span className="flex-1 text-t2">{job.message ?? "Fara mesaj observat inca"}</span>
      </div>
      <div className="flex flex-wrap gap-3 text-[10px] text-t3">
        <span>sursa {job.source}</span>
        <span>queue {job.queueName}</span>
        {job.correlationId ? <span>corr {shortId(job.correlationId)}</span> : null}
        {job.attemptsMade > 0 || job.maxAttempts > 0 ? (
          <span>
            tentative {job.attemptsMade}/{job.maxAttempts || "-"}
          </span>
        ) : null}
        {job.failedReason ? <span className="text-er">reason: {job.failedReason}</span> : null}
        {durationLabel ? <span>{durationLabel}</span> : null}
      </div>
    </div>
  );
}

function WorkerPanel({
  worker,
  jobs,
  batchId,
  workerActionInFlight,
  onPauseWorker,
  onResumeWorker,
}: Readonly<{
  worker: ImportRuntimeWorker;
  jobs: ImportRuntimeJob[];
  batchId: string;
  workerActionInFlight: string | null;
  onPauseWorker: (batchId: string, workerName: string) => Promise<void>;
  onResumeWorker: (
    batchId: string,
    workerName: string,
    mode: "resume" | "recover",
  ) => Promise<void>;
}>) {
  const isPaused = Boolean(worker.control?.workerPaused || worker.control?.batchPaused);
  const needsRecover = jobs.some((job) => ACTIONABLE_RUNTIME_STATES.has(job.state));
  const actionKey = `${batchId}:${worker.workerName}`;
  const isBusy = workerActionInFlight === actionKey;
  return (
    <div className="rounded-xl border border-s700/60 bg-surface-2 p-4 space-y-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-t1">{worker.label}</span>
            <span className="rounded bg-s700 px-1.5 py-0.5 text-[10px] font-mono text-t3">
              {worker.queueName}
            </span>
            <span className="rounded bg-s700 px-1.5 py-0.5 text-[10px] text-t3">
              {worker.stage}
            </span>
          </div>
          <p className="max-w-3xl text-[11px] leading-relaxed text-t3">{worker.description}</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {isPaused ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={async () => {
                await onResumeWorker(
                  batchId,
                  worker.workerName,
                  needsRecover ? "recover" : "resume",
                );
              }}
            >
              {resolveResumeLabel(isBusy, needsRecover, "Resume")}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={async () => {
                await onPauseWorker(batchId, worker.workerName);
              }}
            >
              {isBusy ? "…" : "Pause"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <OverviewCard label="Waiting" value={String(worker.counts.waiting)} />
        <OverviewCard label="Active" value={String(worker.counts.active)} tone="text-sky-600" />
        <OverviewCard label="Paused" value={String(worker.counts.pausedJobs ?? 0)} tone="text-wa" />
        <OverviewCard label="Delayed" value={String(worker.counts.delayed)} tone="text-wa" />
        <OverviewCard label="Failed Live" value={String(worker.counts.failedLive)} tone="text-er" />
        <OverviewCard label="Observed Jobs" value={String(worker.counts.observedJobs)} />
      </div>

      <div className="rounded-lg border border-s700/60 bg-s700/10 px-3 py-2">
        <div className="flex flex-wrap gap-3 text-[11px] text-t3">
          <span>logs {worker.counts.observedLogs}</span>
          <span>completed {worker.counts.observedCompleted}</span>
          <span>warnings {worker.counts.observedWarnings}</span>
          <span>errors {worker.counts.observedErrors}</span>
          {typeof worker.counts.totalUnits === "number" && worker.counts.totalUnits > 0 ? (
            <span>
              unități {formatNumber(worker.counts.processedUnits ?? 0)} /{" "}
              {formatNumber(worker.counts.totalUnits)}
            </span>
          ) : null}
          {worker.counts.prioritized > 0 ? (
            <span>prioritized {worker.counts.prioritized}</span>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        {jobs.length > 0 ? (
          jobs.map((job) => <RuntimeJobCard key={job.key} job={job} />)
        ) : (
          <div className="rounded-md border border-dashed border-s700/60 px-3 py-3 text-[11px] text-t3">
            Niciun job care sa corespunda filtrelor curente.
          </div>
        )}
      </div>
    </div>
  );
}

function RuntimeControlPanel({
  batchId,
  pipeline,
  topology,
  batchActionInFlight,
  onPauseBatch,
  onResumeBatch,
}: Readonly<{
  batchId: string;
  pipeline: ImportPipelineStatus | null;
  topology: ImportRuntimeTopology | null;
  batchActionInFlight: string | null;
  onPauseBatch: (batchId: string) => Promise<void>;
  onResumeBatch: (batchId: string, mode: "resume" | "recover") => Promise<void>;
}>) {
  const globalPaused = Boolean(
    topology?.control?.global?.globalPaused ?? pipeline?.globalControl?.globalPaused,
  );
  const batchPaused = Boolean(
    topology?.control?.batch?.batchPaused ?? pipeline?.batchControl?.batchPaused,
  );
  const sessionStatus = topology?.session?.status ?? null;
  const needsRecover =
    sessionStatus === "failed" ||
    sessionStatus === "stale" ||
    Boolean(
      topology?.workers.some((worker: ImportRuntimeWorker) =>
        worker.jobs.some((job: ImportRuntimeJob) => ACTIONABLE_RUNTIME_STATES.has(job.state)),
      ),
    );
  const isBusy = batchActionInFlight === batchId;

  return (
    <div className="rounded-xl border border-s700/60 bg-surface-2 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <div className="text-sm font-semibold text-t1">Control Operațional</div>
          <div className="text-[11px] text-t3">
            Pause / resume cooperativ pe întreg importul, corelat cu runtime session și workerii
            activi.
          </div>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {batchPaused ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={async () => {
                await onResumeBatch(batchId, needsRecover ? "recover" : "resume");
              }}
            >
              {resolveResumeLabel(isBusy, needsRecover, "Resume Import")}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={async () => {
                await onPauseBatch(batchId);
              }}
            >
              {isBusy ? "…" : "Pause Import"}
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        <OverviewCard
          label="Global"
          value={globalPaused ? "Paused" : "Running"}
          tone={globalPaused ? "text-wa" : "text-ok"}
        />
        <OverviewCard
          label="Batch"
          value={batchPaused ? "Paused" : "Running"}
          tone={batchPaused ? "text-wa" : "text-ok"}
        />
        <OverviewCard
          label="Session"
          value={topology?.session?.status ?? "legacy"}
          hint={topology?.session?.kind ?? "fallback"}
        />
        <OverviewCard
          label="Last Heartbeat"
          value={formatTs(topology?.session?.lastHeartbeatAt ?? null)}
          hint={formatRelativeShort(topology?.session?.lastHeartbeatAt ?? null) ?? undefined}
        />
      </div>
    </div>
  );
}

function AnafProgressPanel({
  progress,
}: Readonly<{ progress: ImportAnafProgress | null | undefined }>) {
  if (!progress) return null;
  const total = progress.totalCuis > 0 ? progress.totalCuis : progress.totalBatches;
  const processed = progress.totalCuis > 0 ? progress.processedCuis : progress.processedBatches;
  const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

  return (
    <div className="rounded-xl border border-s700/60 bg-surface-2 p-4 space-y-3">
      <div>
        <div className="text-sm font-semibold text-t1">Îmbogățire ANAF</div>
        <div className="text-[11px] text-t3">
          Progres runtime unificat pentru loturile de CUI și heartbeat-ul workerului B5.
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        <OverviewCard
          label="State"
          value={progress.state}
          tone={resolveAnafStateTone(progress.state)}
        />
        <OverviewCard
          label="CUI"
          value={`${formatNumber(progress.processedCuis)} / ${formatNumber(progress.totalCuis)}`}
        />
        <OverviewCard
          label="Batchuri"
          value={`${formatNumber(progress.processedBatches)} / ${formatNumber(progress.totalBatches)}`}
        />
        <OverviewCard
          label="Throughput"
          value={formatRate(progress.throughput) ?? "-"}
          hint={formatTs(progress.heartbeatAt)}
        />
      </div>
      <div className="space-y-1">
        <div className="h-2 rounded-full bg-s700/50">
          <div
            className="h-2 rounded-full bg-sky-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="text-[11px] text-t3">
          {formatNumber(processed)} / {formatNumber(total)} unități runtime · {percent}%
          {progress.failedBatches > 0 ? (
            <span className="ml-2 text-er">
              · {formatNumber(progress.failedBatches)} batchuri eșuate
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PromotionMetricsPanel({
  metrics,
}: Readonly<{ metrics: ImportPromotionMetrics | null | undefined }>) {
  if (!metrics) return null;

  return (
    <div className="rounded-xl border border-s700/60 bg-surface-2 p-4 space-y-3">
      <div>
        <div className="text-sm font-semibold text-t1">Promovare Contacte</div>
        <div className="text-[11px] text-t3">
          KPI batch-aware Bronze → Silver și totalurile Silver cerute pentru audit operațional.
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        <OverviewCard label="Scope Total" value={formatNumber(metrics.scopeTotal)} />
        <OverviewCard label="Procesate" value={formatNumber(metrics.processed)} />
        <OverviewCard
          label="Eșuate"
          value={formatNumber(metrics.failed)}
          tone={metrics.failed > 0 ? "text-er" : "text-t1"}
        />
        <OverviewCard label="Silver Inițial" value={formatNumber(metrics.silverContactsInitial)} />
        <OverviewCard
          label="Promovate În Job"
          value={formatNumber(metrics.silverContactsPromotedDuringSession)}
          tone="text-ok"
        />
        <OverviewCard label="Silver Curent" value={formatNumber(metrics.silverContactsCurrent)} />
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] text-t3">
        <span>completed {formatNumber(metrics.completed)}</span>
        <span>running {formatNumber(metrics.running)}</span>
        <span>paused {formatNumber(metrics.paused)}</span>
        <span>skipped {formatNumber(metrics.skipped)}</span>
        {metrics.externalDelta === 0 ? null : (
          <span className="text-wa">external delta {formatNumber(metrics.externalDelta)}</span>
        )}
      </div>
    </div>
  );
}

function PipelineCards({
  pipeline,
  workers,
  logsLoaded,
  isActive,
}: Readonly<{
  pipeline: ImportPipelineStatus | null;
  workers: ImportRuntimeWorker[];
  logsLoaded: number;
  isActive: boolean;
}>) {
  const totalWaiting = workers.reduce((sum, worker) => sum + worker.counts.waiting, 0);
  const totalActive = workers.reduce((sum, worker) => sum + worker.counts.active, 0);
  const totalDelayed = workers.reduce((sum, worker) => sum + worker.counts.delayed, 0);
  const totalFailed = workers.reduce((sum, worker) => sum + worker.counts.failedLive, 0);
  const reprocess = pipeline?.reprocessJob ?? null;

  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
      <OverviewCard
        label="Live"
        value={isActive ? "Activ" : "Snapshot"}
        hint={isActive ? "Polling ~3s pentru queue-uri si loguri" : "Import inactiv"}
        tone={isActive ? "text-sky-600" : "text-t1"}
      />
      <OverviewCard
        label="BullMQ Waiting"
        value={String(totalWaiting)}
        hint={`${totalActive} active · ${totalDelayed} delayed`}
      />
      <OverviewCard
        label="BullMQ Failed"
        value={String(totalFailed)}
        hint={`${workers.length} workeri definiti pentru import`}
        tone={totalFailed > 0 ? "text-er" : "text-t1"}
      />
      <OverviewCard
        label="Reprocess"
        value={reprocess ? `${reprocess.phase ?? "orchestrare"} · ${reprocess.state}` : "inactiv"}
        hint={resolveReprocessHint(reprocess)}
        tone={reprocess?.counterDrift ? "text-wa" : "text-t1"}
      />
      <OverviewCard
        label="Loguri incarcate"
        value={String(logsLoaded)}
        hint="folosite pentru timeline si corelarea joburilor terminate"
      />
    </div>
  );
}

function buildWorkerOptions(workers: ImportRuntimeWorker[]) {
  return [{ value: "", label: "Toți workerii" }].concat(
    workers.map((worker) => ({
      value: worker.workerName,
      label: worker.label,
    })),
  );
}

function buildStageOptions(workers: ImportRuntimeWorker[]) {
  const stages = Array.from(new Set(workers.map((worker) => worker.stage))).sort((left, right) =>
    left.localeCompare(right, "ro"),
  );
  return [{ value: "", label: "Toate stagiile" }].concat(
    stages.map((stage) => ({
      value: stage,
      label: stage,
    })),
  );
}

function buildAttemptOptions(attempts: ImportAttemptSummary[]) {
  return attempts.map((attempt, index) => ({
    value: attempt.id,
    label: `Attempt ${attempts.length - index} · ${attempt.kind} · ${attempt.status}`,
  }));
}

function EmptyState({ isActive }: Readonly<{ isActive: boolean }>) {
  return (
    <div className="py-10 text-center text-sm text-t3">
      {isActive
        ? "Asteptand primele joburi si loguri de la workeri..."
        : "Nu exista telemetrie persistata pentru acest import."}
    </div>
  );
}

export function PipelineProgressPanel({ batchId, isActive }: Readonly<Props>) {
  const [selectedSessionIdsByBatch, setSelectedSessionIdsByBatch] = useState<
    Record<string, string>
  >({});
  const [levelFilter, setLevelFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [workerFilter, setWorkerFilter] = useState("");
  const [search, setSearch] = useState("");
  const selectedSessionId = selectedSessionIdsByBatch[batchId] ?? "";

  const pipelineQuery = useImportPipelineStatus(batchId, {
    enabled: Boolean(batchId),
    session: selectedSessionId || undefined,
  });
  const pipeline = pipelineQuery.data?.data ?? null;
  const effectiveSessionId = resolveEffectiveSessionId(
    batchId,
    selectedSessionIdsByBatch,
    pipeline?.selectedRuntimeSession?.id,
  );
  const logsQuery = useImportJobLogs(batchId, {
    limit: 500,
    tail: true,
    isActive,
    sessionId: effectiveSessionId,
  });
  const runtimeQuery = useImportRuntimeTopology(batchId, {
    enabled: Boolean(batchId),
    isActive,
    session: effectiveSessionId,
  });
  const pauseBatchMutation = usePauseImportBatch();
  const resumeBatchMutation = useResumeImportBatch();
  const pauseWorkerMutation = usePauseImportWorker();
  const resumeWorkerMutation = useResumeImportWorker();

  const timelineLogs = useMemo(() => {
    const logs = (logsQuery.data?.data ?? []) as JobLog[];
    return [...logs].sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    );
  }, [logsQuery.data?.data]);

  const runtimeWorkers = useMemo(
    () => runtimeQuery.data?.data?.workers ?? EMPTY_RUNTIME_WORKERS,
    [runtimeQuery.data?.data?.workers],
  );
  const workerOptions = useMemo(() => buildWorkerOptions(runtimeWorkers), [runtimeWorkers]);
  const stageOptions = useMemo(() => buildStageOptions(runtimeWorkers), [runtimeWorkers]);
  const workerStageByName = useMemo(
    () => new Map(runtimeWorkers.map((worker) => [worker.workerName, worker.stage])),
    [runtimeWorkers],
  );

  const filteredWorkers = useMemo(() => {
    return runtimeWorkers
      .filter((worker) => !stageFilter || worker.stage === stageFilter)
      .filter((worker) => !workerFilter || worker.workerName === workerFilter)
      .map((worker) => ({
        worker,
        jobs: worker.jobs.filter(
          (job) => jobMatchesLevel(job, levelFilter) && matchesSearch(job, search),
        ),
      }))
      .filter(({ worker, jobs }) => {
        const hasObservedActivity =
          worker.counts.waiting > 0 ||
          worker.counts.active > 0 ||
          worker.counts.delayed > 0 ||
          worker.counts.failedLive > 0 ||
          worker.counts.observedJobs > 0 ||
          jobs.length > 0;
        if (workerFilter && worker.workerName === workerFilter) return true;
        if (!hasObservedActivity) return false;
        if (!levelFilter && !search) return true;
        return jobs.length > 0;
      });
  }, [levelFilter, runtimeWorkers, search, stageFilter, workerFilter]);

  const visibleRuntimeJobs = filteredWorkers.reduce((sum, item) => sum + item.jobs.length, 0);
  const visibleWorkers = filteredWorkers.length;
  const errorCount = timelineLogs.filter((log) => log.level === "error").length;
  const warnCount = timelineLogs.filter((log) => log.level === "warn").length;
  const topology = runtimeQuery.data?.data ?? null;
  const logsLoaded = runtimeQuery.data?.data?.totals.logsLoaded ?? timelineLogs.length;
  const attemptOptions = useMemo(
    () => buildAttemptOptions(pipeline?.attempts ?? []),
    [pipeline?.attempts],
  );

  async function handlePauseBatch(targetBatchId: string) {
    try {
      await pauseBatchMutation.mutateAsync(targetBatchId);
      toast.success("Importul a fost pus pe pauză.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nu am putut pune importul pe pauză.");
    }
  }

  async function handleResumeBatch(targetBatchId: string, mode: "resume" | "recover") {
    try {
      await resumeBatchMutation.mutateAsync({
        batchId: targetBatchId,
        mode,
        sessionId: effectiveSessionId,
      });
      toast.success(
        mode === "recover" ? "Importul a fost reluat în modul recover." : "Importul a fost reluat.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nu am putut relua importul.");
    }
  }

  async function handlePauseWorker(targetBatchId: string, workerName: string) {
    try {
      await pauseWorkerMutation.mutateAsync({ batchId: targetBatchId, workerName });
      toast.success(`Workerul ${workerName} a fost pus pe pauză.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nu am putut pune workerul pe pauză.");
    }
  }

  async function handleResumeWorker(
    targetBatchId: string,
    workerName: string,
    mode: "resume" | "recover",
  ) {
    try {
      await resumeWorkerMutation.mutateAsync({
        batchId: targetBatchId,
        workerName,
        mode,
        sessionId: effectiveSessionId,
      });
      toast.success(
        mode === "recover"
          ? `Workerul ${workerName} a fost reluat în recover.`
          : `Workerul ${workerName} a fost reluat.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nu am putut relua workerul.");
    }
  }

  return (
    <div className="space-y-4">
      <PipelineCards
        pipeline={pipeline}
        workers={runtimeWorkers}
        logsLoaded={logsLoaded}
        isActive={isActive}
      />

      <RuntimeControlPanel
        batchId={batchId}
        pipeline={pipeline}
        topology={topology}
        batchActionInFlight={
          pauseBatchMutation.isPending || resumeBatchMutation.isPending ? batchId : null
        }
        onPauseBatch={handlePauseBatch}
        onResumeBatch={handleResumeBatch}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <AnafProgressPanel progress={topology?.anafProgress ?? pipeline?.anafProgress} />
        <PromotionMetricsPanel metrics={topology?.promotionMetrics ?? pipeline?.promotionMetrics} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {attemptOptions.length > 0 ? (
          <div className="w-60">
            <Select
              value={effectiveSessionId ?? ""}
              onValueChange={(value) =>
                setSelectedSessionIdsByBatch((current) => ({
                  ...current,
                  [batchId]: value,
                }))
              }
              options={attemptOptions}
            />
          </div>
        ) : null}
        <div className="w-44">
          <Select
            value={levelFilter}
            onValueChange={(value) => setLevelFilter(value)}
            options={LEVEL_OPTIONS}
          />
        </div>
        <div className="w-48">
          <Select
            value={stageFilter}
            onValueChange={(value) => setStageFilter(value)}
            options={stageOptions}
          />
        </div>
        <div className="w-56">
          <Select
            value={workerFilter}
            onValueChange={(value) => setWorkerFilter(value)}
            options={workerOptions}
          />
        </div>
        <div className="min-w-[16rem] flex-1">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cauta dupa worker, job id, contact id, queue, step sau mesaj"
          />
        </div>
        <span className="text-xs text-t3">
          {visibleWorkers} workeri activi · {visibleRuntimeJobs} joburi vizibile
          {errorCount > 0 ? (
            <span className="ml-2 font-semibold text-er">· {errorCount} erori</span>
          ) : null}
          {warnCount > 0 ? (
            <span className="ml-2 font-semibold text-wa">· {warnCount} warn</span>
          ) : null}
        </span>
        {isActive ? (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-sky-600">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-sky-500" />
            <span>Actualizare live</span>
          </span>
        ) : null}
      </div>

      {!levelFilter && !stageFilter && !workerFilter && !search ? (
        <ErrorSummaryPanel
          logs={timelineLogs}
          total={timelineLogs.filter((log) => log.level === "error").length}
        />
      ) : null}

      {runtimeQuery.isPending || logsQuery.isPending ? (
        <div className="flex justify-center py-10">
          <Spinner size={24} />
        </div>
      ) : null}

      {!runtimeQuery.isPending && runtimeWorkers.length === 0 && timelineLogs.length === 0 ? (
        <EmptyState isActive={isActive} />
      ) : null}

      {!runtimeQuery.isPending && filteredWorkers.length > 0 ? (
        <div className="space-y-3">
          {filteredWorkers.map(({ worker, jobs }) => (
            <WorkerPanel
              key={worker.workerName}
              worker={worker}
              jobs={jobs}
              batchId={batchId}
              workerActionInFlight={
                pauseWorkerMutation.isPending || resumeWorkerMutation.isPending
                  ? `${batchId}:${resumeWorkerMutation.variables?.workerName ?? pauseWorkerMutation.variables?.workerName ?? ""}`
                  : null
              }
              onPauseWorker={handlePauseWorker}
              onResumeWorker={handleResumeWorker}
            />
          ))}
        </div>
      ) : null}

      {!logsQuery.isPending && timelineLogs.length > 0 ? (
        <div className="rounded-xl border border-s700/60 bg-surface-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-t1">Timeline evenimente</div>
              <div className="text-[11px] text-t3">
                Fluxul recent de loguri persistate pe batch. Acesta completeaza snapshot-ul BullMQ
                cu detaliile de executie la nivel de pas.
              </div>
            </div>
            <div className="text-[11px] text-t3">{timelineLogs.length} loguri afisate</div>
          </div>
          <div className="mt-3 font-mono">
            {timelineLogs
              .filter(
                (log) => !stageFilter || workerStageByName.get(log.workerName) === stageFilter,
              )
              .filter((log) => !workerFilter || log.workerName === workerFilter)
              .filter((log) => !levelFilter || log.level === levelFilter)
              .filter((log) => {
                const query = search.trim();
                if (!query) return true;
                const haystack = [
                  log.workerName,
                  log.jobId,
                  log.bronzeContactId,
                  log.step,
                  log.message,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase();
                return haystack.includes(query.toLowerCase());
              })
              .map((log) => (
                <TimelineRow key={log.id} log={log} />
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
