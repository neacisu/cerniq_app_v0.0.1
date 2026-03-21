import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/index.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import {
  fetchImports,
  uploadImport,
  downloadImportTemplate,
  fetchTemplateColumns,
  retryImport,
  fetchMappingTargets,
  fetchImportHeaders,
  saveImportMapping,
  rePromoteImport,
  anafEnrichImport,
} from "@/lib/etapa1-api.js";
import type { MappingTarget, PromoteJobStatus } from "@/lib/etapa1-api.js";
import { FileUpload } from "@/components/forms/FileUpload.js";
import { Button } from "@/components/ui/button.js";
import { Select } from "@/components/ui/select.js";
import { Dialog, DialogContent } from "@/components/ui/dialog.js";
import {
  usePromoteJobStatus,
  useResumeImportReprocessErrors,
  useResumePromoteJob,
} from "@/hooks/use-etapa1.js";
import { ApiError } from "@/lib/api.js";
import { cn } from "@/lib/utils.js";

const ACCEPT =
  ".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";
const UNMAPPED_VALUE = "__unmapped__";
type FileSelection = FileList | File[] | null;

function toFileArray(files: FileSelection) {
  if (!files) {
    return [];
  }

  return Array.isArray(files) ? files : Array.from(files);
}

function isAcceptedImportFile(file: File) {
  return (
    file.name.endsWith(".csv") ||
    file.name.endsWith(".xlsx") ||
    file.name.endsWith(".xls") ||
    file.type === "text/csv" ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

function getImportProgress(processed: number, total: number, status: string) {
  if (total > 0) {
    return Math.min(100, Math.round((processed / total) * 100));
  }

  return status === "completed" ? 100 : 0;
}

function getImportProgressLabel(processed: number, total: number, status: string) {
  if (total > 0) {
    return `${processed.toLocaleString("ro-RO")} / ${total.toLocaleString("ro-RO")} rânduri`;
  }

  if (status === "processing" && processed > 0) {
    return `${processed.toLocaleString("ro-RO")} procesate până acum`;
  }

  return `${processed.toLocaleString("ro-RO")} procesate`;
}

function getImportTimeLabel(createdAt: unknown, lastProgressAt: string | null) {
  if (lastProgressAt) {
    return `Actualizat ${new Date(lastProgressAt).toLocaleString()}`;
  }

  return new Date(String(createdAt)).toLocaleString();
}

function getImportActivityTimestamp(metadata: Record<string, unknown>, createdAt: unknown) {
  const candidates = [
    metadata.identityReprocessLastProgressAt,
    metadata.identityReprocessCompletedAt,
    metadata.identityReprocessStartedAt,
    metadata.identityReprocessQueuedAt,
    metadata.lastProgressAt,
    createdAt,
  ];

  const firstTimestamp = candidates.find((value) => typeof value === "string" && value.length > 0);
  return typeof firstTimestamp === "string" ? firstTimestamp : String(createdAt);
}

function getStatusToneClass(status: string) {
  if (status === "completed") {
    return "text-ok";
  }

  if (status === "failed") {
    return "text-er";
  }

  if (status === "cancelled") {
    return "text-t3";
  }

  return "text-t2";
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
  return { sessionProcessedBaseRows, hasFreshHeartbeat, elapsedMs, overallElapsedMs };
}

function getIdentityReprocessMetrics(metadata: Record<string, unknown>, totalRows: number) {
  const state = getIdentityReprocessState(metadata);
  if (!state) {
    return null;
  }

  const processedRows = Number(metadata.identityReprocessProcessedRows ?? 0);
  const resolvedRows = Number(metadata.identityReprocessResolvedRows ?? 0);
  const runTotalRows = Number(metadata.identityReprocessRunTotalRows ?? totalRows ?? 0);
  const failedContacts = Number(metadata.identityReprocessFailedContactCount ?? 0);
  const total = Math.max(runTotalRows, processedRows, 0);
  const progress = computeReprocessProgress(processedRows, total);
  const { hasFreshHeartbeat, elapsedMs, overallElapsedMs, sessionProcessedBaseRows } =
    computeReprocessTiming(metadata);
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
    failedContacts,
    totalRows: total,
    progress,
    throughput,
    etaMs,
    hasFreshHeartbeat,
  };
}

function getIdentityReprocessLabel(metadata: Record<string, unknown>, totalRows: number) {
  const metrics = getIdentityReprocessMetrics(metadata, totalRows);
  if (!metrics) {
    return null;
  }

  if (metrics.state === "queued") {
    return "Re-rezolvare identitate: în coadă";
  }

  if (metrics.state === "running") {
    return `Re-rezolvare identitate: în curs (${metrics.processedRows.toLocaleString("ro-RO")} rânduri reevaluate)`;
  }

  if (metrics.state === "failed") {
    return "Re-rezolvare identitate: eșuată";
  }

  if (metrics.processedRows < metrics.totalRows) {
    return `Re-rezolvare identitate: finalizată incomplet (${(metrics.totalRows - metrics.processedRows).toLocaleString("ro-RO")} rânduri lipsă)`;
  }

  if (metrics.failedContacts > 0) {
    return `Re-rezolvare identitate: finalizată cu erori (${metrics.failedContacts.toLocaleString("ro-RO")} contacte eșuate)`;
  }

  return `Re-rezolvare identitate: finalizată (${metrics.resolvedRows.toLocaleString("ro-RO")} rânduri rezolvate)`;
}

function isIdentityReprocessActive(metadata: Record<string, unknown>) {
  const state = getIdentityReprocessState(metadata);
  return state === "queued" || state === "running";
}

function isTransientApiUnavailable(error: unknown): error is ApiError {
  return error instanceof ApiError && [502, 503, 504].includes(error.status);
}

function getPollingBackoffMs(error: unknown, failureCount: number, baseIntervalMs: number): number {
  if (!isTransientApiUnavailable(error)) {
    return baseIntervalMs;
  }

  const retryStep = Math.max(0, failureCount - 1);
  return Math.min(60_000, baseIntervalMs * 2 ** retryStep);
}

// ── Promote Job Heartbeat ─────────────────────────────────────────────────────

const ACTIONABLE_JOB_STATES = new Set(["failed", "stale", "stalled", "backlogged"]);

function getHeartbeatStateClass(state: string): string {
  if (ACTIONABLE_JOB_STATES.has(state)) return "text-er";
  if (state === "completed") return "text-ok";
  return "text-t2";
}

function getAttemptsSuffix(job: Pick<PromoteJobStatus, "attemptsMade" | "maxAttempts">): string {
  if (job.attemptsMade != null && job.maxAttempts != null && job.maxAttempts > 1) {
    return ` (tentativa ${job.attemptsMade}/${job.maxAttempts})`;
  }
  return "";
}

function HeartbeatErrorPanel({
  job,
  failedContactCount,
  visible,
}: Readonly<{ job: PromoteJobStatus; failedContactCount: number; visible: boolean }>) {
  if (!visible) return null;
  return (
    <div className="rounded-md border border-er/30 bg-er/8 px-3 py-2 space-y-1">
      {failedContactCount > 0 ? (
        <p className="text-[11px] font-medium text-t2">
          {failedContactCount.toLocaleString("ro-RO")} contacte au rămas în lista de erori pentru
          reprocess separat.
        </p>
      ) : null}
      {job.failedReason ? (
        <p className="text-[11px] font-medium text-er break-all">{job.failedReason}</p>
      ) : null}
      {job.stacktrace ? (
        <pre className="text-[10px] text-t3 whitespace-pre-wrap break-all leading-relaxed max-h-36 overflow-y-auto font-mono">
          {job.stacktrace}
        </pre>
      ) : null}
      {job.processedOn ? (
        <p className="text-[10px] text-t3">
          Ultima rulare: {new Date(job.processedOn).toLocaleString("ro-RO")}
        </p>
      ) : null}
    </div>
  );
}

type HeartbeatDotProps = { state: string };

function HeartbeatDot({ state }: Readonly<HeartbeatDotProps>) {
  if (state === "active" || state === "waiting" || state === "delayed" || state === "prioritized") {
    return (
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
      </span>
    );
  }
  if (state === "stale" || state === "stalled") {
    return (
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-wa opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-wa" />
      </span>
    );
  }
  if (state === "backlogged") {
    return (
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-wa opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-wa" />
      </span>
    );
  }
  if (state === "failed") {
    return <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-er" />;
  }
  if (state === "completed") {
    return <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-ok" />;
  }
  // queued / unknown
  return <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-t3 opacity-50" />;
}

function heartbeatStateLabel(state: string): string {
  const labels: Record<string, string> = {
    waiting: "în coadă",
    prioritized: "prioritizat în coadă",
    active: "rulează",
    delayed: "amânat",
    backlogged: "blocat în coadă",
    stale: "blocat (stale)",
    stalled: "blocat (stalled)",
    failed: "eșuat",
    completed: "finalizat",
    unknown: "necunoscut",
    none: "",
  };
  return labels[state] ?? state;
}

type PromoteJobHeartbeatProps = {
  batchId: string;
  identityReprocessStatus: string | null;
  failedContactCount: number;
  onResumed: () => void;
};

function HeartbeatUnavailableMessage({ status }: Readonly<{ status: number }>) {
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <HeartbeatDot state="unknown" />
        <span className="text-[10px] font-medium text-wa">
          Job re-promovare: status indisponibil temporar (API {status})
        </span>
      </div>
    </div>
  );
}

function HeartbeatAvailabilityHint({ status }: Readonly<{ status: number }>) {
  return (
    <span className="text-[10px] text-wa">heartbeat indisponibil temporar (API {status})</span>
  );
}

function shouldShowResumeErrorsButton(
  state: PromoteJobStatus["state"],
  failedContactCount: number,
) {
  return failedContactCount > 0 && (state === "failed" || state === "completed");
}

type HeartbeatStatusRowProps = {
  state: PromoteJobStatus["state"];
  stateClass: string;
  stateLabel: string;
  attemptsSuffix: string;
  apiUnavailableStatus: number | null;
  isActionable: boolean;
  showErrorsButton: boolean;
  hasErrorDetails: boolean;
  errorExpanded: boolean;
  failedContactCount: number;
  resumePending: boolean;
  resumeErrorsPending: boolean;
  onResume: () => void;
  onResumeErrors: () => void;
  onToggleDetails: () => void;
};

function HeartbeatStatusRow({
  state,
  stateClass,
  stateLabel,
  attemptsSuffix,
  apiUnavailableStatus,
  isActionable,
  showErrorsButton,
  hasErrorDetails,
  errorExpanded,
  failedContactCount,
  resumePending,
  resumeErrorsPending,
  onResume,
  onResumeErrors,
  onToggleDetails,
}: Readonly<HeartbeatStatusRowProps>) {
  return (
    <div className="flex items-center gap-2">
      <HeartbeatDot state={state} />
      <span className={`text-[10px] font-medium ${stateClass}`}>
        Job re-promovare: {stateLabel}
        {attemptsSuffix}
      </span>

      {apiUnavailableStatus === null ? null : (
        <HeartbeatAvailabilityHint status={apiUnavailableStatus} />
      )}

      {isActionable ? (
        <Button
          variant="outline"
          size="sm"
          disabled={resumePending}
          onClick={onResume}
          className="h-5 px-2 py-0 text-[10px] font-semibold"
        >
          {resumePending ? "…" : "Resume"}
        </Button>
      ) : null}

      {showErrorsButton ? (
        <Button
          variant="outline"
          size="sm"
          disabled={resumeErrorsPending}
          onClick={onResumeErrors}
          className="h-5 px-2 py-0 text-[10px] font-semibold"
        >
          {resumeErrorsPending ? "…" : `Resume erori (${failedContactCount})`}
        </Button>
      ) : null}

      {hasErrorDetails ? (
        <button
          type="button"
          className="text-[10px] text-t3 underline underline-offset-2 hover:text-t2"
          onClick={onToggleDetails}
        >
          {errorExpanded ? "ascunde" : "detalii"}
        </button>
      ) : null}
    </div>
  );
}

function PromoteJobHeartbeat({
  batchId,
  identityReprocessStatus,
  failedContactCount,
  onResumed,
}: Readonly<PromoteJobHeartbeatProps>) {
  const [errorExpanded, setErrorExpanded] = useState(false);

  // Only poll when a re-promote has ever been triggered
  const hasReprocessHistory = Boolean(identityReprocessStatus);
  const jobStatusQuery = usePromoteJobStatus(batchId, {
    enabled: hasReprocessHistory,
    expectedDbStatus: identityReprocessStatus,
  });
  const resumeMutation = useResumePromoteJob();
  const resumeErrorsMutation = useResumeImportReprocessErrors();
  const apiUnavailableError = isTransientApiUnavailable(jobStatusQuery.error)
    ? jobStatusQuery.error
    : null;

  if (!hasReprocessHistory) return null;
  if (jobStatusQuery.isPending) return null;

  const job = jobStatusQuery.data?.data;
  if (!job || job.state === "none") {
    return apiUnavailableError ? (
      <HeartbeatUnavailableMessage status={apiUnavailableError.status} />
    ) : null;
  }

  const state = job.state;
  const isActionable = ACTIONABLE_JOB_STATES.has(state);
  const showErrorsButton = shouldShowResumeErrorsButton(state, failedContactCount);
  const hasErrorDetails = (state === "failed" || state === "stale") && Boolean(job.failedReason);
  const showErrorPanel = errorExpanded && (state === "failed" || state === "stale");
  const stateLabel = heartbeatStateLabel(state);
  const stateClass = getHeartbeatStateClass(state);
  const attemptsSuffix = getAttemptsSuffix(job);
  const apiUnavailableStatus = apiUnavailableError?.status ?? null;

  const handleResume = () => {
    resumeMutation
      .mutateAsync(batchId)
      .then(onResumed)
      .catch(() => undefined);
  };

  const handleResumeErrors = () => {
    resumeErrorsMutation
      .mutateAsync(batchId)
      .then(onResumed)
      .catch(() => undefined);
  };

  const handleToggleDetails = () => {
    setErrorExpanded((value) => !value);
  };

  return (
    <div className="mt-2 space-y-1.5">
      <HeartbeatStatusRow
        state={state}
        stateClass={stateClass}
        stateLabel={stateLabel}
        attemptsSuffix={attemptsSuffix}
        apiUnavailableStatus={apiUnavailableStatus}
        isActionable={isActionable}
        showErrorsButton={showErrorsButton}
        hasErrorDetails={hasErrorDetails}
        errorExpanded={errorExpanded}
        failedContactCount={failedContactCount}
        resumePending={resumeMutation.isPending}
        resumeErrorsPending={resumeErrorsMutation.isPending}
        onResume={handleResume}
        onResumeErrors={handleResumeErrors}
        onToggleDetails={handleToggleDetails}
      />

      <HeartbeatErrorPanel
        job={job}
        failedContactCount={failedContactCount}
        visible={showErrorPanel}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function RequiredBadge({ required }: { required: boolean }) {
  return required ? (
    <span className="inline-flex items-center rounded-full bg-er/15 px-2 py-0.5 text-[10px] font-semibold text-er">
      OBLIGATORIU
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-s700 px-2 py-0.5 text-[10px] font-medium text-t3">
      opțional
    </span>
  );
}

function AutoMapBadge({ autoMapped }: { autoMapped: boolean }) {
  return autoMapped ? (
    <span className="inline-flex items-center rounded-full bg-ok/15 px-2 py-0.5 text-[10px] font-medium text-ok">
      DA
    </span>
  ) : (
    <span className="text-t3">—</span>
  );
}

type ImportRowProps = {
  readonly imp: Record<string, unknown>;
  readonly actionInProgress: string | null;
  readonly onOpenMappingDialog: (id: string) => Promise<void>;
  readonly onRePromote: (id: string) => Promise<void>;
  readonly onAnafEnrich: (id: string) => Promise<void>;
  readonly onRetry: (id: string) => Promise<void>;
  readonly onImportRefetch: () => void;
};

type ImportRowActionsProps = {
  readonly id: string;
  readonly status: string;
  readonly actionInProgress: string | null;
  readonly isReprocessActive: boolean;
  readonly onOpenMappingDialog: (id: string) => Promise<void>;
  readonly onRePromote: (id: string) => Promise<void>;
  readonly onAnafEnrich: (id: string) => Promise<void>;
  readonly onRetry: (id: string) => Promise<void>;
  readonly className?: string;
};

function ImportRowActions({
  id,
  status,
  actionInProgress,
  isReprocessActive,
  onOpenMappingDialog,
  onRePromote,
  onAnafEnrich,
  onRetry,
  className,
}: ImportRowActionsProps) {
  const canRetry = ["pending", "failed", "cancelled"].includes(status);
  return (
    <div className={cn("flex shrink-0 flex-wrap items-center gap-1.5 lg:justify-end", className)}>
      <Button
        variant="outline"
        size="sm"
        disabled={actionInProgress !== null}
        onClick={async () => {
          await onOpenMappingDialog(id);
        }}
      >
        Mapeaza
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={actionInProgress !== null || isReprocessActive}
        onClick={async () => {
          await onRePromote(id);
        }}
      >
        {actionInProgress === `repromote-${id}` ? "…" : "Re-promoveaza"}
      </Button>
      {status === "completed" ? (
        <Button
          variant="outline"
          size="sm"
          disabled={actionInProgress !== null}
          onClick={async () => {
            await onAnafEnrich(id);
          }}
        >
          {actionInProgress === `anaf-${id}` ? "…" : "Prelucreaza ANAF"}
        </Button>
      ) : null}
      {canRetry ? (
        <Button
          variant="outline"
          size="sm"
          disabled={actionInProgress !== null || isReprocessActive}
          onClick={async () => {
            await onRetry(id);
          }}
        >
          {actionInProgress === `retry-${id}` ? "…" : "Resume"}
        </Button>
      ) : null}
    </div>
  );
}

function ImportHistoryRow({
  imp,
  actionInProgress,
  onOpenMappingDialog,
  onRePromote,
  onAnafEnrich,
  onRetry,
  onImportRefetch,
}: ImportRowProps) {
  const id = String(imp.id);
  const status = String(imp.status);
  const processed = Number(imp.processedRows ?? 0);
  const total = Number(imp.totalRows ?? 0);
  const metadata = (imp.metadata as Record<string, unknown> | undefined) ?? {};
  const lastProgressAt = getImportActivityTimestamp(metadata, imp.createdAt);
  const lastError = typeof metadata.lastError === "string" ? metadata.lastError : null;
  const progress = getImportProgress(processed, total, status);
  const progressLabel = getImportProgressLabel(processed, total, status);
  const timeLabel = getImportTimeLabel(imp.createdAt, lastProgressAt);
  const isProcessing = status === "processing";
  const hasKnownTotal = total > 0;
  const identitySummary = (imp.identitySummary as Record<string, unknown> | undefined) ?? {};
  const resolvedCompanies = Number(identitySummary.resolvedCompanies ?? 0).toLocaleString("ro-RO");
  const duplicateSourceRows = Number(identitySummary.duplicateSourceRows ?? 0).toLocaleString(
    "ro-RO",
  );
  const identityConflictRows = Number(identitySummary.identityConflictRows ?? 0).toLocaleString(
    "ro-RO",
  );
  const identityReprocessLabel = getIdentityReprocessLabel(metadata, total);
  const identityReprocessMetrics = getIdentityReprocessMetrics(metadata, total);
  const failedReprocessContacts = Number(metadata.identityReprocessFailedContactCount ?? 0);
  const identityReprocessDetails = identityReprocessMetrics
    ? [
        `${identityReprocessMetrics.processedRows.toLocaleString("ro-RO")} / ${identityReprocessMetrics.totalRows.toLocaleString("ro-RO")} reevaluate`,
        `${identityReprocessMetrics.progress}%`,
        identityReprocessMetrics.throughput
          ? `~${Math.max(1, Math.round(identityReprocessMetrics.throughput)).toLocaleString("ro-RO")} rânduri/s`
          : null,
        identityReprocessMetrics.state === "running" && identityReprocessMetrics.etaMs
          ? `ETA ${formatCompactDuration(identityReprocessMetrics.etaMs)}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <div key={id} className="py-4">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        {/* Metadata, identitate, progres secundar — ocupă lățimea disponibilă */}
        <div className="min-w-0 w-full flex-1 space-y-2">
          <p className="break-words text-sm font-medium leading-snug text-t1">
            {String(imp.filename ?? imp.id)}
          </p>
          <p className="text-xs text-t3">
            {progressLabel} · {timeLabel}
          </p>
          <p className="text-[10px] leading-relaxed text-t3 sm:text-[11px]">
            {`Entități rezolvate: ${resolvedCompanies} · Duplicate sursă: ${duplicateSourceRows} · Conflicte identitate: ${identityConflictRows}`}
          </p>
          {identityReprocessLabel ? (
            <p className="text-[10px] font-medium text-t2 sm:text-[11px]">
              {identityReprocessLabel}
            </p>
          ) : null}
          {identityReprocessMetrics ? (
            <div className="mt-1 w-full max-w-full">
              <ProgressBar
                value={identityReprocessMetrics.progress}
                indeterminate={
                  identityReprocessMetrics.state === "running" &&
                  identityReprocessMetrics.totalRows <= 0
                }
              />
              {identityReprocessDetails ? (
                <p className="mt-1 text-[10px] text-t3 sm:text-[11px]">
                  {identityReprocessDetails}
                </p>
              ) : null}
            </div>
          ) : null}
          <PromoteJobHeartbeat
            batchId={id}
            identityReprocessStatus={
              typeof metadata.identityReprocessStatus === "string"
                ? metadata.identityReprocessStatus
                : null
            }
            failedContactCount={failedReprocessContacts}
            onResumed={onImportRefetch}
          />
          {lastError && status === "failed" ? (
            <p className="mt-1 line-clamp-3 text-xs text-er sm:line-clamp-2">{lastError}</p>
          ) : null}
        </div>

        {/* Progres + status + acțiuni: coloană dedicată pe desktop; pe mobil sub metadata */}
        <div className="flex w-full min-w-0 shrink-0 flex-col gap-3 border-t border-s700/50 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:border-t-0 sm:pt-0 lg:w-60 lg:flex-col lg:items-stretch lg:justify-start lg:gap-3 xl:w-72">
          <div className="flex min-w-0 w-full items-center gap-3 sm:max-w-[min(100%,28rem)] lg:max-w-none">
            <div className="min-w-0 flex-1">
              <ProgressBar value={progress} indeterminate={isProcessing && !hasKnownTotal} />
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 text-xs font-medium capitalize tabular-nums",
                getStatusToneClass(status),
              )}
            >
              {status}
            </span>
          </div>
          <ImportRowActions
            id={id}
            status={status}
            actionInProgress={actionInProgress}
            isReprocessActive={isIdentityReprocessActive(metadata)}
            onOpenMappingDialog={onOpenMappingDialog}
            onRePromote={onRePromote}
            onAnafEnrich={onAnafEnrich}
            onRetry={onRetry}
            className="w-full justify-start sm:justify-end lg:w-full lg:justify-start"
          />
        </div>
      </div>
    </div>
  );
}

export function Import() {
  const [uploadMessage, setUploadMessage] = useState("");
  const [showColumns, setShowColumns] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<"csv" | "xlsx" | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [mappingDialogId, setMappingDialogId] = useState<string | null>(null);
  const [mappingState, setMappingState] = useState<Record<string, string>>({});
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingSaving, setMappingSaving] = useState(false);
  const [mappingHeaders, setMappingHeaders] = useState<
    Array<{ sheetName: string; headers: string[] }>
  >([]);
  const [mappingTargets, setMappingTargets] = useState<MappingTarget[]>([]);

  const importsQuery = useQuery({
    queryKey: ["etapa1", "imports"],
    queryFn: () => fetchImports({ limit: 25, offset: 0 }),
    refetchInterval: (query) => {
      if (isTransientApiUnavailable(query.state.error)) {
        return getPollingBackoffMs(query.state.error, query.state.fetchFailureCount, 3000);
      }

      const rows =
        (query.state.data as { data?: Array<Record<string, unknown>> } | undefined)?.data ?? [];
      const getRefetchInterval = (row: Record<string, unknown>) => {
        const metadata = (row.metadata as Record<string, unknown> | undefined) ?? {};
        if (
          ["pending", "processing"].includes(String(row.status ?? "")) ||
          isIdentityReprocessActive(metadata)
        ) {
          return 3000;
        }

        const hasIdentityReprocessHistory =
          typeof metadata.identityReprocessQueuedAt === "string" ||
          typeof metadata.identityReprocessStartedAt === "string" ||
          typeof metadata.identityReprocessCompletedAt === "string" ||
          typeof metadata.identityReprocessFailedAt === "string";

        return hasIdentityReprocessHistory ? 15000 : false;
      };

      if (rows.some((row) => getRefetchInterval(row) === 3000)) {
        return 3000;
      }

      return rows.some((row) => getRefetchInterval(row) === 15000) ? 15000 : false;
    },
    refetchIntervalInBackground: true,
    retry: (failureCount, error) => {
      if (isTransientApiUnavailable(error)) {
        return false;
      }

      return failureCount < 3;
    },
  });

  const columnsQuery = useQuery({
    queryKey: ["etapa1", "template-columns"],
    queryFn: fetchTemplateColumns,
    enabled: showColumns,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadImport(file),
    onSuccess: async () => {
      await importsQuery.refetch();
    },
  });

  const handleFiles = async (files: FileSelection) => {
    const firstFile = toFileArray(files).find(isAcceptedImportFile);

    if (!firstFile) {
      return;
    }

    try {
      await uploadMutation.mutateAsync(firstFile);
      setUploadMessage(`Fișier încărcat: ${firstFile.name}`);
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : "Eroare la încărcarea fișierului.");
    }
  };

  const handleDownloadTemplate = async (format: "csv" | "xlsx") => {
    setDownloadingFormat(format);
    try {
      await downloadImportTemplate(format);
    } catch {
      setUploadMessage("Eroare la descărcarea template-ului.");
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleRetry = async (id: string) => {
    setActionInProgress(`retry-${id}`);
    try {
      await retryImport(id);
      await importsQuery.refetch();
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : "Eroare la reluarea importului.");
    } finally {
      setActionInProgress(null);
    }
  };

  const openMappingDialog = useCallback(async (id: string) => {
    setMappingLoading(true);
    setMappingDialogId(id);
    try {
      const [headersRes, targetsRes] = await Promise.all([
        fetchImportHeaders(id),
        fetchMappingTargets(),
      ]);
      setMappingHeaders(headersRes.data.sheets);
      setMappingTargets(targetsRes.data);
      const initial: Record<string, string> = {};
      const saved = headersRes.data.savedMapping ?? headersRes.data.autoMapping;
      for (const sheet of headersRes.data.sheets) {
        for (const h of sheet.headers) {
          initial[h] = saved[h] ?? UNMAPPED_VALUE;
        }
      }
      setMappingState(initial);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadMessage(
        typeof msg === "string" && msg.length > 0 ? msg : "Eroare la încărcarea headerelor.",
      );
      setMappingDialogId(null);
    } finally {
      setMappingLoading(false);
    }
  }, []);

  const handleSaveMapping = async () => {
    if (!mappingDialogId) return;
    setMappingSaving(true);
    try {
      const cleanMapping: Record<string, string> = {};
      for (const [header, target] of Object.entries(mappingState)) {
        if (target && target !== UNMAPPED_VALUE) cleanMapping[header] = target;
      }
      await saveImportMapping(mappingDialogId, cleanMapping);
      setUploadMessage("Maparea a fost salvată pentru promovarea Bronze→Silver.");
      await importsQuery.refetch();
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : "Eroare la salvarea mapării.");
    } finally {
      setMappingSaving(false);
    }
  };

  const handleRePromote = async (id: string) => {
    setActionInProgress(`repromote-${id}`);
    try {
      const result = await rePromoteImport(id);
      const data = result?.data as Record<string, unknown> | undefined;
      if (data?.alreadyQueued) {
        setUploadMessage("Re-promovare deja în curs. Așteaptă finalizarea job-ului existent.");
      } else {
        setUploadMessage("Re-rezolvare identitate + promovare Bronze→Silver programate.");
      }
      await importsQuery.refetch();
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : "Eroare la re-promovare.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAnafEnrich = async (id: string) => {
    setActionInProgress(`anaf-${id}`);
    try {
      const result = await anafEnrichImport(id);
      const data = result?.data as Record<string, unknown> | undefined;
      const queued = Number(data?.queued ?? 0);
      if (queued === 0) {
        setUploadMessage("Toate contactele au fost deja îmbogățite ANAF.");
      } else {
        setUploadMessage(`${queued} CUI-uri trimise la ANAF pentru îmbogățire.`);
      }
      await importsQuery.refetch();
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : "Eroare la îmbogățirea ANAF.");
    } finally {
      setActionInProgress(null);
    }
  };

  const imports = importsQuery.data?.data ?? [];
  const importsRefetchUnavailableError = isTransientApiUnavailable(importsQuery.error)
    ? importsQuery.error
    : null;
  const columns = columnsQuery.data?.data ?? [];

  const allUniqueHeaders = Array.from(new Set(mappingHeaders.flatMap((s) => s.headers)));
  const targetOptions = [
    { value: UNMAPPED_VALUE, label: "— Nu mapa (păstrează original) —" },
    ...mappingTargets.map((t) => ({ value: t.key, label: t.label })),
  ];

  const handleUploadSelection = (files: FileSelection) => {
    handleFiles(files).catch((error: unknown) => {
      setUploadMessage(error instanceof Error ? error.message : "Eroare la încărcarea fișierului.");
    });
  };

  if (importsQuery.isPending) {
    return (
      <PageWrapper title="Import Contacte">
        <div className="flex items-center justify-center py-12">
          <Spinner size={32} />
        </div>
      </PageWrapper>
    );
  }

  if (importsQuery.isError) {
    return (
      <PageWrapper title="Import Contacte">
        <div className="rounded-lg border border-er/30 bg-er/10 p-4 text-sm text-er">
          Eroare la încărcarea datelor: {importsQuery.error?.message ?? "Eroare necunoscută"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Import Contacte">
      {/* Template section */}
      <Card className="mb-6 min-w-0">
        <CardHeader>
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
            <div className="min-w-0 flex-1">
              <CardTitle>Template Import</CardTitle>
              <p className="mt-2 text-xs leading-relaxed text-t3 sm:mt-1">
                Descarcă template-ul (CSV sau Excel) cu toate coloanele necesare pentru un import
                corect. Fișierul Excel include și o foaie cu instrucțiuni detaliate.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-stretch gap-2 sm:justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowColumns((v) => !v)}>
                {showColumns ? "Ascunde coloane" : "Vezi structura coloanelor"}
              </Button>
              <Button
                variant="brand"
                size="sm"
                disabled={downloadingFormat !== null}
                onClick={async () => {
                  await handleDownloadTemplate("csv");
                }}
              >
                {downloadingFormat === "csv" ? "Se descarcă…" : "Descarcă CSV"}
              </Button>
              <Button
                variant="brand"
                size="sm"
                disabled={downloadingFormat !== null}
                onClick={async () => {
                  await handleDownloadTemplate("xlsx");
                }}
              >
                {downloadingFormat === "xlsx" ? "Se descarcă…" : "Descarcă Excel"}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showColumns && (
          <CardBody>
            {columnsQuery.isPending ? (
              <div className="flex justify-center py-4">
                <Spinner size={20} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-s700">
                      <th className="px-3 py-2 text-left font-semibold text-t2">Coloană</th>
                      <th className="px-3 py-2 text-left font-semibold text-t2">Obligatoriu</th>
                      <th className="px-3 py-2 text-left font-semibold text-t2">Auto-mapare</th>
                      <th className="px-3 py-2 text-left font-semibold text-t2">Descriere</th>
                      <th className="px-3 py-2 text-left font-semibold text-t2">Exemplu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((col) => (
                      <tr key={col.header} className="border-b border-s800 last:border-0">
                        <td className="px-3 py-2 font-mono text-t1">{col.header}</td>
                        <td className="px-3 py-2">
                          <RequiredBadge required={col.required} />
                        </td>
                        <td className="px-3 py-2">
                          <AutoMapBadge autoMapped={col.autoMapped} />
                        </td>
                        <td className="px-3 py-2 text-t2">{col.description}</td>
                        <td className="px-3 py-2 font-mono text-t3">{col.example}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-[10px] text-t3">
                  Coloanele cu auto-mapare sunt recunoscute automat de sistem (inclusiv aliasuri:
                  firma, company, cif, vat, mail, etc.). Coloanele suplimentare sunt păstrate
                  integral în datele brute.
                </p>
              </div>
            )}
          </CardBody>
        )}
      </Card>

      {/* Upload section */}
      <FileUpload
        accept={ACCEPT}
        multiple
        onFilesSelected={handleUploadSelection}
        label="Trage fișiere CSV sau Excel aici"
      />
      {uploadMessage ? <p className="mt-3 text-xs text-ok">{uploadMessage}</p> : null}
      {importsQuery.isRefetchError && importsRefetchUnavailableError ? (
        <p className="mt-2 text-xs text-wa">
          API import este indisponibil temporar. Ultimele date afișate rămân vizibile, iar poll-ul a
          trecut pe backoff.
        </p>
      ) : null}

      {/* Import history */}
      <Card className="mt-6 min-w-0">
        <CardHeader>
          <CardTitle>Istoric Importuri</CardTitle>
        </CardHeader>
        <CardBody className="min-w-0">
          <div className="min-w-0 space-y-0 divide-y divide-s700/60">
            {imports.length === 0 ? (
              <p className="py-4 text-center text-sm text-t3">
                Niciun import efectuat. Folosește template-ul de mai sus pentru a pregăti datele.
              </p>
            ) : (
              imports.map((imp: Record<string, unknown>) => (
                <ImportHistoryRow
                  key={String(imp.id)}
                  imp={imp}
                  actionInProgress={actionInProgress}
                  onOpenMappingDialog={openMappingDialog}
                  onRePromote={handleRePromote}
                  onAnafEnrich={handleAnafEnrich}
                  onRetry={handleRetry}
                  onImportRefetch={() => {
                    importsQuery.refetch().catch(() => undefined);
                  }}
                />
              ))
            )}
          </div>
        </CardBody>
      </Card>

      <Dialog
        open={mappingDialogId !== null}
        onOpenChange={(open) => {
          if (!open) setMappingDialogId(null);
        }}
      >
        <DialogContent
          title="Mapare Coloane"
          description="Configurare mapping Bronze→Silver. Salvarea nu reimportă fișierul, ci setează regulile folosite la promovare."
          className="max-w-3xl"
        >
          {mappingLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size={28} />
            </div>
          ) : (
            <>
              {mappingHeaders.length > 1 && (
                <p className="mb-3 text-xs text-t3">
                  Fișierul conține {mappingHeaders.length} tab-uri:{" "}
                  {mappingHeaders.map((s) => s.sheetName).join(", ")}
                </p>
              )}
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-s700">
                    <th className="w-1/2 px-3 py-2 text-left font-semibold text-t2">
                      Coloană din fișier
                    </th>
                    <th className="w-1/2 px-3 py-2 text-left font-semibold text-t2">Câmp DB</th>
                  </tr>
                </thead>
                <tbody>
                  {allUniqueHeaders.map((header) => (
                    <tr key={header} className="border-b border-s800 last:border-0">
                      <td className="px-3 py-2 font-mono text-xs text-t1">{header}</td>
                      <td className="px-3 py-2">
                        <Select
                          options={targetOptions}
                          value={mappingState[header] ?? UNMAPPED_VALUE}
                          onValueChange={(val) =>
                            setMappingState((prev) => ({ ...prev, [header]: val }))
                          }
                          placeholder="Selectează câmpul..."
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex justify-end gap-2 border-t border-s700 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMappingDialogId(null)}
                  disabled={mappingSaving}
                >
                  Anulează
                </Button>
                <Button
                  variant="brand"
                  size="sm"
                  onClick={async () => {
                    await handleSaveMapping();
                  }}
                  disabled={mappingSaving}
                >
                  {mappingSaving ? "Se salvează…" : "Salvează mapping"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (mappingDialogId) {
                      await handleRePromote(mappingDialogId);
                    }
                  }}
                  disabled={mappingSaving || !mappingDialogId}
                >
                  Re-promovează Bronze→Silver
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
