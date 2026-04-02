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
import type {
  MappingTarget,
  PromoteJobStatus,
  ImportPipelineStatus,
  JobLog,
} from "@/lib/etapa1-api.js";
import { FileUpload } from "@/components/forms/FileUpload.js";
import { Button } from "@/components/ui/button.js";
import { Select } from "@/components/ui/select.js";
import { Dialog, DialogContent } from "@/components/ui/dialog.js";
import {
  useImportPipelineStatus,
  useImportJobLogs,
  useImportControl,
  usePauseImportsGlobal,
  useResumeImportsGlobal,
  usePauseImportBatch,
  useResumeImportBatch,
  useDeleteImportBatch,
  useCancelImport,
  useResumeImportReprocessErrors,
  useResumePromoteJob,
} from "@/hooks/use-etapa1.js";
import { ApiError } from "@/lib/api.js";
import { cn } from "@/lib/utils.js";

const ACCEPT =
  ".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";
const UNMAPPED_VALUE = "__unmapped__";
type FileSelection = FileList | File[] | null;
type ImportRowRecord = Record<string, unknown>;
type ImportsQueryData = { data?: ImportRowRecord[] };
type UploadMessageSetter = (message: string) => void;
type ActionInProgressSetter = (value: string | null) => void;
type ImportQueryStateSnapshot = {
  error: unknown;
  fetchFailureCount: number;
  data?: ImportsQueryData;
};
type PromotionMetrics = ImportPipelineStatus["promotionMetrics"] | null | undefined;
type TemplateColumn = {
  header: string;
  required: boolean;
  autoMapped: boolean;
  description: string;
  example: string;
};
type ImportHeaderSheet = {
  sheetName: string;
  headers: string[];
};
type MappingTargetOption = {
  value: string;
  label: string;
};

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

function toUiErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function runImportMessageAction(args: {
  action: () => Promise<void>;
  fallbackErrorMessage: string;
  setUploadMessage: UploadMessageSetter;
}) {
  try {
    await args.action();
  } catch (error) {
    args.setUploadMessage(toUiErrorMessage(error, args.fallbackErrorMessage));
  }
}

async function runTrackedImportAction(args: {
  actionKey: string;
  action: () => Promise<void>;
  fallbackErrorMessage: string;
  setActionInProgress: ActionInProgressSetter;
  setUploadMessage: UploadMessageSetter;
}) {
  args.setActionInProgress(args.actionKey);
  try {
    await args.action();
  } catch (error) {
    args.setUploadMessage(toUiErrorMessage(error, args.fallbackErrorMessage));
  } finally {
    args.setActionInProgress(null);
  }
}

function hasIdentityReprocessHistory(metadata: Record<string, unknown>) {
  return (
    typeof metadata.identityReprocessQueuedAt === "string" ||
    typeof metadata.identityReprocessStartedAt === "string" ||
    typeof metadata.identityReprocessCompletedAt === "string" ||
    typeof metadata.identityReprocessFailedAt === "string"
  );
}

function getImportRowRefetchInterval(row: ImportRowRecord) {
  const metadata = (row.metadata as Record<string, unknown> | undefined) ?? {};
  const status = String(row.status ?? "");
  const isActiveImport = ["pending", "processing"].includes(status);
  if (isActiveImport || isIdentityReprocessActive(metadata)) {
    return 3000;
  }

  return hasIdentityReprocessHistory(metadata) ? 15000 : false;
}

function resolveImportsRefetchInterval(queryState: ImportQueryStateSnapshot) {
  if (queryState.error instanceof ApiError && queryState.error.status === 401) return false;
  if (isTransientApiUnavailable(queryState.error)) {
    return getPollingBackoffMs(queryState.error, queryState.fetchFailureCount, 3000);
  }

  const rows = queryState.data?.data ?? [];
  if (rows.some((row) => getImportRowRefetchInterval(row) === 3000)) {
    return 3000;
  }

  return rows.some((row) => getImportRowRefetchInterval(row) === 15000) ? 15000 : false;
}

function shouldRetryImportsQuery(failureCount: number, error: unknown) {
  if (error instanceof ApiError && error.status === 401) return false;
  if (isTransientApiUnavailable(error)) return false;
  return failureCount < 3;
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
  const total = runTotalRows > 0 ? runTotalRows : Math.max(processedRows, 0);
  const counterDrift = total > 0 && processedRows > total;
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
    counterDrift,
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
    if (metrics.counterDrift) {
      return "Re-rezolvare identitate: în curs (contor peste scope-ul batch-ului)";
    }
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

function buildImportIdentitySummaryLine(identitySummary: Record<string, unknown>) {
  const resolvedCompanies = Number(identitySummary.resolvedCompanies ?? 0).toLocaleString("ro-RO");
  const duplicateSourceRows = Number(identitySummary.duplicateSourceRows ?? 0).toLocaleString(
    "ro-RO",
  );
  const identityConflictRows = Number(identitySummary.identityConflictRows ?? 0).toLocaleString(
    "ro-RO",
  );

  return `Entități rezolvate: ${resolvedCompanies} · Duplicate sursă: ${duplicateSourceRows} · Conflicte identitate: ${identityConflictRows}`;
}

function buildImportLatestAttemptLine(
  latestAttemptSummary: Record<string, unknown>,
  quarantineSummary: Record<string, unknown>,
) {
  const successRows = Number(latestAttemptSummary.successRows ?? 0).toLocaleString("ro-RO");
  const duplicateRows = Number(latestAttemptSummary.duplicateRows ?? 0).toLocaleString("ro-RO");
  const errorRows = Number(latestAttemptSummary.errorRows ?? 0).toLocaleString("ro-RO");
  const quarantineRows = Number(quarantineSummary.totalRows ?? 0).toLocaleString("ro-RO");

  return `Ultima încercare: ${successRows} salvate · ${duplicateRows} duplicate · ${errorRows} erori · ${quarantineRows} quarantine`;
}

type IdentityReprocessDisplay = {
  label: string | null;
  metrics: ReturnType<typeof getIdentityReprocessMetrics>;
  details: string | null;
  failedContactCount: number;
  status: string | null;
};

function buildIdentityReprocessDisplay(
  metadata: Record<string, unknown>,
  totalRows: number,
): IdentityReprocessDisplay {
  const metrics = getIdentityReprocessMetrics(metadata, totalRows);
  const details = metrics
    ? [
        `${metrics.processedRows.toLocaleString("ro-RO")} / ${metrics.totalRows.toLocaleString("ro-RO")} rânduri Bronze reevaluate`,
        `${metrics.progress}%`,
        metrics.throughput
          ? `~${Math.max(1, Math.round(metrics.throughput)).toLocaleString("ro-RO")} rânduri/s`
          : null,
        metrics.state === "running" && metrics.etaMs
          ? `ETA ${formatCompactDuration(metrics.etaMs)}`
          : null,
        metrics.counterDrift
          ? "Avertisment: contorul depășește scope-ul curent al batch-ului"
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return {
    label: getIdentityReprocessLabel(metadata, totalRows),
    metrics,
    details,
    failedContactCount: Number(metadata.identityReprocessFailedContactCount ?? 0),
    status:
      typeof metadata.identityReprocessStatus === "string"
        ? metadata.identityReprocessStatus
        : null,
  };
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

// ── Counters Grid ─────────────────────────────────────────────────────────────

type CounterItem = { label: string; value: number; tone?: "ok" | "er" | "wa" | "t3" };

function getCounterValueClass(tone: CounterItem["tone"]): string {
  if (tone === "ok") return "text-ok font-semibold";
  if (tone === "er") return "text-er font-semibold";
  if (tone === "wa") return "text-wa font-semibold";
  return "text-t2";
}

function CountersGrid({ items }: Readonly<{ items: CounterItem[] }>) {
  const visible = items.filter((i) => i.value > 0);
  if (visible.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
      {visible.map((item) => {
        const valueClass = getCounterValueClass(item.tone);
        return (
          <div key={item.label} className="flex items-center gap-1">
            <span className="text-[10px] text-t3">{item.label}:</span>
            <span className={`text-[10px] tabular-nums ${valueClass}`}>
              {item.value.toLocaleString("ro-RO")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Timing Details ────────────────────────────────────────────────────────────

function computeHeartbeatAge(lastProgressAt: string | null | undefined): {
  age: number | null;
  isStale: boolean;
} {
  if (!lastProgressAt) return { age: null, isStale: false };
  const age = Date.now() - Date.parse(lastProgressAt);
  return { age, isStale: age > 120_000 };
}

function computeSessionElapsedMs(
  sessionStartedAt: string | null | undefined,
  lastProgressAt: string | null | undefined,
): number | null {
  const sessionStartedAtMs = sessionStartedAt ? Date.parse(sessionStartedAt) : Number.NaN;
  const lastProgressAtMs = lastProgressAt ? Date.parse(lastProgressAt) : Number.NaN;
  const refNow = Number.isFinite(lastProgressAtMs) ? lastProgressAtMs : Date.now();
  return Number.isFinite(sessionStartedAtMs) ? refNow - sessionStartedAtMs : null;
}

function TimingDetails({
  sessionStartedAt,
  lastProgressAt,
  completedAt,
  elapsedMs,
  etaMs,
}: Readonly<{
  sessionStartedAt?: string | null;
  lastProgressAt?: string | null;
  completedAt?: string | null;
  elapsedMs?: number | null;
  etaMs?: number | null;
}>) {
  const { age: heartbeatAge, isStale: isHeartbeatStale } = computeHeartbeatAge(lastProgressAt);
  const parts: string[] = [];
  if (sessionStartedAt) {
    parts.push(
      `Înc. ${new Date(sessionStartedAt).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`,
    );
  }
  if (elapsedMs != null && elapsedMs > 0) parts.push(`Durată: ${formatCompactDuration(elapsedMs)}`);
  if (etaMs != null) parts.push(`ETA: ${formatCompactDuration(etaMs)}`);
  if (completedAt) {
    parts.push(
      `Fin. ${new Date(completedAt).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`,
    );
  }
  if (parts.length === 0 && !isHeartbeatStale) return null;
  return (
    <div className="mt-1 space-y-0.5">
      {parts.length > 0 && (
        <p className="text-[10px] leading-relaxed text-t3">{parts.join(" · ")}</p>
      )}
      {isHeartbeatStale && heartbeatAge !== null && (
        <p className="text-[10px] font-medium text-wa">
          ⚠ Ultimul heartbeat acum {formatCompactDuration(heartbeatAge)} — worker posibil blocat
        </p>
      )}
    </div>
  );
}

// ── Ingest Phase Stage ────────────────────────────────────────────────────────

function getIngestStageState(batchStatus: string): string {
  if (batchStatus === "processing") return "active";
  if (batchStatus === "failed") return "failed";
  if (batchStatus !== "pending") return "completed";
  return "waiting";
}

function getIngestProgressLabel(
  processedRows: number,
  totalRows: number,
  progress: number,
): string {
  if (totalRows > 0)
    return `${processedRows.toLocaleString("ro-RO")} / ${totalRows.toLocaleString("ro-RO")} rânduri · ${progress}%`;
  if (processedRows > 0) return `${processedRows.toLocaleString("ro-RO")} rânduri parsate`;
  return "în progres…";
}

function IngestPhaseStage({
  batchStatus,
  processedRows,
  totalRows,
}: Readonly<{ batchStatus: string; processedRows: number; totalRows: number }>) {
  const isActive = batchStatus === "processing";
  const isDone = batchStatus !== "pending" && batchStatus !== "processing";
  const isFailed = batchStatus === "failed";
  const state = getIngestStageState(batchStatus);
  const progress = totalRows > 0 ? Math.min(100, Math.floor((processedRows / totalRows) * 100)) : 0;
  if (processedRows === 0 && !isActive) return null;
  const progressLabel = getIngestProgressLabel(processedRows, totalRows, progress);
  return (
    <PipelineStageRow label="Ingest & Normalizare (A/B/C)" state={state}>
      <div className="mt-1.5 space-y-1">
        <ProgressBar
          value={isDone && !isFailed ? 100 : progress}
          indeterminate={isActive && totalRows <= 0}
        />
        <p className="text-[10px] text-t3">{progressLabel}</p>
        <p className="text-[10px] text-t3 opacity-70">
          A1:csv-parser / A2:excel-parser → B1–B5 normalizers → C1–C2 validators
        </p>
      </div>
    </PipelineStageRow>
  );
}

// ── ANAF Phase Stage ──────────────────────────────────────────────────────────

function getAnafStageState(status: string): string {
  if (status === "processing") return "active";
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  return "waiting";
}

function getAnafProgress(total: number, processed: number, state: string): number {
  if (total > 0) return Math.min(100, Math.floor((processed / total) * 100));
  if (state === "completed") return 100;
  return 0;
}

function AnafPhaseStage({
  metadata,
  runtimeProgress,
}: Readonly<{
  metadata: Record<string, unknown>;
  runtimeProgress?: ImportPipelineStatus["anafProgress"] | null;
}>) {
  const status =
    runtimeProgress?.state ??
    (typeof metadata.anafEnrichmentStatus === "string" ? metadata.anafEnrichmentStatus : null);
  if (!status) return null;
  const state = getAnafStageState(status);
  const processed = Number(
    runtimeProgress?.processedCuis ??
      metadata.anafEnrichmentProcessedCuis ??
      metadata.anafEnrichmentProcessed ??
      0,
  );
  const total = Number(
    runtimeProgress?.totalCuis ??
      metadata.anafEnrichmentTotalCuis ??
      metadata.anafEnrichmentTotal ??
      0,
  );
  const enriched = Number(metadata.anafEnrichedCount ?? 0);
  const failed = Number(runtimeProgress?.failedBatches ?? metadata.anafFailedCount ?? 0);
  const progress = getAnafProgress(total, processed, state);
  const startedAt =
    runtimeProgress?.startedAt ??
    (typeof metadata.anafEnrichmentStartedAt === "string"
      ? metadata.anafEnrichmentStartedAt
      : null);
  const completedAt =
    runtimeProgress?.completedAt ??
    (typeof metadata.anafEnrichmentCompletedAt === "string"
      ? metadata.anafEnrichmentCompletedAt
      : null);
  const throughput =
    typeof runtimeProgress?.throughput === "number" && Number.isFinite(runtimeProgress.throughput)
      ? ` · ~${Math.max(1, Math.round(runtimeProgress.throughput)).toLocaleString("ro-RO")} CUI/s`
      : "";
  return (
    <PipelineStageRow label="Îmbogățire ANAF Bronze" state={state}>
      <div className="mt-1.5 space-y-1">
        {(total > 0 || state === "active" || state === "completed") && (
          <>
            <ProgressBar value={progress} indeterminate={state === "active" && total <= 0} />
            <p className="text-[10px] text-t3">
              {processed.toLocaleString("ro-RO")} / {total.toLocaleString("ro-RO")} CUI-uri ·{" "}
              {progress}%{throughput}
            </p>
          </>
        )}
        <CountersGrid
          items={[
            { label: "Îmbogățite", value: enriched, tone: "ok" },
            { label: "Eșuate", value: failed, tone: "er" },
          ]}
        />
        {startedAt && (
          <p className="text-[10px] text-t3">
            {`Înc. ${new Date(startedAt).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}`}
            {completedAt
              ? ` · Fin. ${new Date(completedAt).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}`
              : ""}
          </p>
        )}
      </div>
    </PipelineStageRow>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

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

function shouldShowResumeErrorsButton(
  state: PromoteJobStatus["state"],
  failedContactCount: number,
) {
  return failedContactCount > 0 && (state === "failed" || state === "completed");
}

// ── Pipeline Progress Panel ────────────────────────────────────────────────────

type PipelineProgressPanelProps = {
  batchId: string;
  batchStatus: string;
  processedRows: number;
  totalRows: number;
  metadata: Record<string, unknown>;
  identityReprocessStatus: string | null;
  failedContactCount: number;
  onResumed: () => void;
};

function pipelinePhaseLabel(phase: string | null | undefined): string {
  if (phase === "resolve_identities") return "Re-rezolvare identitate";
  if (phase === "queue_promotions") return "Punere în coadă promovări";
  return "Orchestrare";
}

function PipelineStageRow({
  label,
  state,
  children,
}: Readonly<{ label: string; state: string; children?: React.ReactNode }>) {
  return (
    <div className="space-y-1 rounded-md border border-s700/60 bg-s700/20 px-3 py-2">
      <div className="flex items-center gap-2">
        <HeartbeatDot state={state} />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-t3">{label}</span>
        <span className={`text-[10px] font-medium ${getHeartbeatStateClass(state)}`}>
          {heartbeatStateLabel(state)}
        </span>
      </div>
      {children}
    </div>
  );
}

type ReprocessJobMetrics = {
  progress: number;
  processed: number;
  total: number;
  counterDrift: boolean;
  throughput: number | null;
  etaMs: number | null;
  statsLine: string;
  attemptsSuffix: string;
};

function buildReprocessStatsLine(job: NonNullable<ImportPipelineStatus["reprocessJob"]>): string {
  const parts: string[] = [];
  if (job.resolved > 0) parts.push(`${job.resolved.toLocaleString("ro-RO")} rânduri rezolv.`);
  if (job.duplicateSource > 0)
    parts.push(`${job.duplicateSource.toLocaleString("ro-RO")} rânduri duplicate`);
  if (job.identityConflict > 0)
    parts.push(`${job.identityConflict.toLocaleString("ro-RO")} conflicte`);
  if (job.insufficientIdentifiers > 0)
    parts.push(`${job.insufficientIdentifiers.toLocaleString("ro-RO")} id. insuf.`);
  if (job.failedContacts > 0)
    parts.push(`${job.failedContacts.toLocaleString("ro-RO")} rânduri eșuate`);
  return parts.join(" · ");
}

function computeReprocessJobMetrics(
  job: NonNullable<ImportPipelineStatus["reprocessJob"]>,
): ReprocessJobMetrics {
  const { processed, total } = job;
  const counterDrift = job.counterDrift === true || (total > 0 && processed > total);
  const progress = total > 0 ? Math.min(100, Math.floor((processed / total) * 100)) : 0;
  const sessionStartedAtMs = job.sessionStartedAt ? Date.parse(job.sessionStartedAt) : Number.NaN;
  const lastProgressAtMs = job.lastProgressAt ? Date.parse(job.lastProgressAt) : Number.NaN;
  const refNow = Number.isFinite(lastProgressAtMs) ? lastProgressAtMs : Date.now();
  const sessionElapsedMs =
    Number.isFinite(sessionStartedAtMs) && refNow > sessionStartedAtMs
      ? refNow - sessionStartedAtMs
      : null;
  const throughput =
    sessionElapsedMs && sessionElapsedMs > 0 && processed > 0
      ? processed / (sessionElapsedMs / 1000)
      : null;
  const remainingRows = total > processed ? total - processed : 0;
  const etaMs = throughput && remainingRows > 0 ? (remainingRows / throughput) * 1000 : null;
  const statsLine = buildReprocessStatsLine(job);
  const attemptsSuffix =
    job.attemptsMade != null && job.maxAttempts != null && job.maxAttempts > 1
      ? ` · tentativa ${job.attemptsMade}/${job.maxAttempts}`
      : "";
  return { progress, processed, total, counterDrift, throughput, etaMs, statsLine, attemptsSuffix };
}

function ReprocessProgressDetails({
  phase,
  state,
  metrics,
}: Readonly<{
  phase: string | null;
  state: string;
  metrics: ReprocessJobMetrics;
}>) {
  if (phase !== "resolve_identities" && phase !== "queue_promotions") return null;
  const { processed, total, counterDrift, progress, throughput, etaMs, statsLine, attemptsSuffix } =
    metrics;
  const progressLabelParts = [
    `${processed.toLocaleString("ro-RO")} / ${total.toLocaleString("ro-RO")} rânduri Bronze · ${progress}%`,
    throughput ? `~${Math.max(1, Math.round(throughput)).toLocaleString("ro-RO")} r/s` : null,
    etaMs ? `ETA ${formatCompactDuration(etaMs)}` : null,
  ].filter(Boolean);
  const isQueuePhase = phase === "queue_promotions";
  return (
    <div className="mt-1.5 space-y-1">
      {total > 0 ? (
        <>
          <ProgressBar
            value={isQueuePhase ? 100 : progress}
            indeterminate={state === "active" && total <= 0}
          />
          <p className="text-[10px] text-t3">
            {isQueuePhase
              ? `Finalizat · ${processed.toLocaleString("ro-RO")} rânduri Bronze procesate`
              : progressLabelParts.join(" · ")}
          </p>
        </>
      ) : null}
      {counterDrift ? (
        <p className="text-[10px] leading-relaxed text-wa">
          Contor inconsistent: workerul raportează mai multe rânduri Bronze decât scope-ul curent al
          batch-ului.
        </p>
      ) : null}
      {statsLine ? <p className="text-[10px] text-t3 leading-relaxed">{statsLine}</p> : null}
      {attemptsSuffix ? <p className="text-[10px] text-t3">{attemptsSuffix}</p> : null}
    </div>
  );
}

type ReprocessActionButtonsProps = {
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

function ReprocessActionButtons({
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
}: Readonly<ReprocessActionButtonsProps>) {
  if (!isActionable && !showErrorsButton && !hasErrorDetails) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
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

function ReprocessWorkerStage({
  job,
  onResume,
  resumePending,
  onResumeErrors,
  resumeErrorsPending,
  failedContactCount,
}: Readonly<{
  job: NonNullable<ImportPipelineStatus["reprocessJob"]>;
  onResume: () => void;
  resumePending: boolean;
  onResumeErrors: () => void;
  resumeErrorsPending: boolean;
  failedContactCount: number;
}>) {
  const [errorExpanded, setErrorExpanded] = useState(false);
  const { phase, state } = job;
  const isActionable = ACTIONABLE_JOB_STATES.has(state);
  const showErrorsButton = shouldShowResumeErrorsButton(
    state as PromoteJobStatus["state"],
    failedContactCount,
  );
  const hasErrorDetails = (state === "failed" || state === "stale") && Boolean(job.failedReason);
  const showErrorPanel = errorExpanded && (state === "failed" || state === "stale");
  const metrics = computeReprocessJobMetrics(job);
  const workerLabel = phase ? pipelinePhaseLabel(phase) : "Worker Orchestrare";
  const errorJob = {
    failedReason: job.failedReason,
    stacktrace: job.stacktrace,
    processedOn: job.processedOn,
  } as PromoteJobStatus;

  // Compute session elapsed time (via helper to avoid Date.now() in render)
  const elapsedMs = computeSessionElapsedMs(job.sessionStartedAt, job.lastProgressAt);

  return (
    <PipelineStageRow label={workerLabel} state={state}>
      {/* Job metadata row */}
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
        {job.mode === "errors_only" && (
          <span className="text-[10px] font-medium text-t3">📋 Mod: erori</span>
        )}
        {job.jobId && (
          <span className="text-[10px] font-mono text-t3">job …{job.jobId.slice(-8)}</span>
        )}
        {job.attemptsMade != null && job.maxAttempts != null && job.maxAttempts > 1 && (
          <span className="text-[10px] text-t3">
            tentativa {job.attemptsMade}/{job.maxAttempts}
          </span>
        )}
        {job.dbStatus && job.dbStatus !== state && (
          <span className="text-[10px] text-t3">DB: {job.dbStatus}</span>
        )}
      </div>
      {/* Progress bar + row counter */}
      <ReprocessProgressDetails phase={phase} state={state} metrics={metrics} />
      {/* Counter breakdown grid */}
      <CountersGrid
        items={[
          { label: "Rânduri rezolv.", value: job.resolved, tone: "ok" },
          { label: "Rânduri dup.", value: job.duplicateSource },
          { label: "Conflicte id.", value: job.identityConflict, tone: "wa" },
          { label: "Id. insuf.", value: job.insufficientIdentifiers },
          { label: "Coadă promovare", value: job.promotionQueued, tone: "ok" },
          { label: "Rânduri eș.", value: job.failedContacts, tone: "er" },
        ]}
      />
      {/* Session timing + heartbeat warning */}
      <TimingDetails
        sessionStartedAt={job.sessionStartedAt}
        lastProgressAt={job.lastProgressAt}
        completedAt={job.completedAt ?? null}
        elapsedMs={elapsedMs}
        etaMs={metrics.etaMs}
      />
      {/* Action buttons */}
      <ReprocessActionButtons
        isActionable={isActionable}
        showErrorsButton={showErrorsButton}
        hasErrorDetails={hasErrorDetails}
        errorExpanded={errorExpanded}
        failedContactCount={failedContactCount}
        resumePending={resumePending}
        resumeErrorsPending={resumeErrorsPending}
        onResume={onResume}
        onResumeErrors={onResumeErrors}
        onToggleDetails={() => setErrorExpanded((v) => !v)}
      />
      <HeartbeatErrorPanel
        job={errorJob}
        failedContactCount={failedContactCount}
        visible={showErrorPanel}
      />
    </PipelineStageRow>
  );
}

function derivePromotionQueueState(queue: ImportPipelineStatus["promotionQueue"]): string {
  if (queue.active > 0) return "active";
  if (queue.waiting > 0) return "waiting";
  if (queue.failed > 0 && queue.completed === 0) return "failed";
  if (queue.completed > 0) return "completed";
  return "unknown";
}

function resolvePromotionQueueTotal(
  queue: ImportPipelineStatus["promotionQueue"],
  promotionQueued: number,
  metrics: PromotionMetrics,
) {
  const scopeTotal = Number(metrics?.scopeTotal ?? 0);
  if (scopeTotal > 0) {
    return scopeTotal;
  }

  if (promotionQueued > 0) {
    return promotionQueued;
  }

  return queue.waiting + queue.active + queue.completed + queue.failed;
}

function formatPromotionExternalDelta(metrics: PromotionMetrics) {
  if (!metrics || metrics.externalDelta === 0) {
    return null;
  }

  return ` · external delta ${metrics.externalDelta.toLocaleString("ro-RO")}`;
}

function PromotionQueueStage({
  queue,
  promotionQueued,
  metrics,
}: Readonly<{
  queue: ImportPipelineStatus["promotionQueue"];
  promotionQueued: number;
  metrics?: ImportPipelineStatus["promotionMetrics"] | null;
}>) {
  const total = resolvePromotionQueueTotal(queue, promotionQueued, metrics);
  const done = Number(metrics?.processed ?? queue.completed);
  const progress = total > 0 ? Math.min(100, Math.floor((done / total) * 100)) : 0;
  const queueState = derivePromotionQueueState(queue);
  const externalDeltaLabel = formatPromotionExternalDelta(metrics);
  return (
    <PipelineStageRow label="Promovare Contacte (workers paraleli)" state={queueState}>
      {total > 0 ? (
        <div className="mt-1.5 space-y-1">
          <ProgressBar value={progress} />
          <p className="text-[10px] text-t3">
            {done.toLocaleString("ro-RO")} / {total.toLocaleString("ro-RO")} · {progress}%
          </p>
          <CountersGrid
            items={[
              {
                label: "Finalizate",
                value: Number(metrics?.completed ?? queue.completed),
                tone: "ok",
              },
              { label: "Active", value: Number(metrics?.running ?? queue.active) },
              { label: "În coadă", value: queue.waiting },
              { label: "Amânate", value: queue.delayed },
              { label: "Eșuate", value: Number(metrics?.failed ?? queue.failed), tone: "er" },
            ]}
          />
          {metrics ? (
            <p className="text-[10px] text-t3">
              Silver: {metrics.silverContactsInitial.toLocaleString("ro-RO")} inițiale ·{" "}
              {metrics.silverContactsPromotedDuringSession.toLocaleString("ro-RO")} promovate în job
              · {metrics.silverContactsCurrent.toLocaleString("ro-RO")} total
              {externalDeltaLabel ? <span className="text-wa">{externalDeltaLabel}</span> : null}
            </p>
          ) : null}
        </div>
      ) : null}
    </PipelineStageRow>
  );
}

function getReprocessFallbackMessage(status: string | null): string {
  if (status === "queued") return "Job în așteptare în coadă BullMQ…";
  if (status === "completed") return "Finalizat — job BullMQ arhivat";
  if (status === "failed") return "Eșuat — apăsați Resume pentru retry";
  return "Status din DB (job BullMQ indisponibil)";
}

function PipelineProgressPanel({
  batchId,
  batchStatus,
  processedRows,
  totalRows,
  metadata,
  identityReprocessStatus,
  failedContactCount,
  onResumed,
}: Readonly<PipelineProgressPanelProps>) {
  const hasReprocessHistory = Boolean(identityReprocessStatus);
  const isAnyActive =
    batchStatus === "processing" ||
    identityReprocessStatus === "running" ||
    identityReprocessStatus === "queued";
  const hasAnaf = Boolean(metadata.anafEnrichmentStatus);
  const shouldFetchLogs =
    processedRows > 0 || batchStatus === "processing" || hasReprocessHistory || hasAnaf;

  const pipelineQuery = useImportPipelineStatus(batchId, {
    enabled: hasReprocessHistory,
    expectedDbStatus: identityReprocessStatus,
  });
  const logsQuery = useImportJobLogs(shouldFetchLogs ? batchId : undefined, {
    level: "error",
    limit: 50,
    tail: true,
    isActive: isAnyActive,
  });
  const resumeMutation = useResumePromoteJob();
  const resumeErrorsMutation = useResumeImportReprocessErrors();
  const [errorsExpanded, setErrorsExpanded] = useState(false);

  const hasIngestData = processedRows > 0 || batchStatus === "processing";
  if (!hasIngestData && !hasReprocessHistory && !hasAnaf) return null;

  const apiUnavailableError =
    pipelineQuery.error instanceof ApiError && [502, 503, 504].includes(pipelineQuery.error.status)
      ? pipelineQuery.error
      : null;

  const logsResult = logsQuery.data as { data?: JobLog[]; meta?: { total?: number } } | undefined;
  const errorLogs = logsResult?.data ?? [];
  const totalErrors = logsResult?.meta?.total ?? 0;

  const pipeline = apiUnavailableError ? null : (pipelineQuery.data?.data ?? null);
  const reprocessJob = pipeline?.reprocessJob ?? null;
  const promotionQueue = pipeline?.promotionQueue ?? {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
  };
  const hasPromotionActivity =
    promotionQueue.waiting > 0 ||
    promotionQueue.active > 0 ||
    promotionQueue.completed > 0 ||
    promotionQueue.failed > 0;

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

  return (
    <div className="mt-2 space-y-1.5">
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-t3">
          Workeri pipeline
        </p>
        {isAnyActive && (
          <span className="flex items-center gap-1 text-[10px] text-sky-500">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" /> live
          </span>
        )}
      </div>

      {/* Error summary bar — toate erorile reale din job logs */}
      {totalErrors > 0 && (
        <div className="rounded-md border border-er/30 bg-er/8 px-3 py-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-er">
              ✗ {totalErrors} {totalErrors === 1 ? "eroare detectată" : "erori detectate"} în
              pipeline
            </span>
            <button
              type="button"
              onClick={() => setErrorsExpanded((v) => !v)}
              className="text-[10px] text-er underline underline-offset-2 hover:opacity-80"
            >
              {errorsExpanded ? "ascunde" : "detalii"}
            </button>
          </div>
          {errorsExpanded && errorLogs.length > 0 && (
            <div className="mt-1 max-h-64 space-y-1.5 overflow-y-auto">
              {errorLogs.map((log) => (
                <div key={log.id} className="rounded-sm border border-er/20 bg-er/5 px-2 py-1.5">
                  <div className="flex flex-wrap items-start gap-1.5">
                    <span className="mt-0.5 shrink-0 tabular-nums text-[9px] text-t3">
                      {new Date(log.createdAt).toLocaleTimeString("ro-RO", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <span className="mt-0.5 shrink-0 rounded bg-surface-3 px-1 font-mono text-[9px] text-t3">
                      {log.workerName}
                    </span>
                    <span className="mt-0.5 shrink-0 text-[9px] text-t3">[{log.step}]</span>
                    <span className="flex-1 text-[10px] font-medium leading-snug text-er">
                      {log.message}
                    </span>
                  </div>
                  {log.details != null && Object.keys(log.details).length > 0 && (
                    <pre className="mt-1 max-h-24 overflow-x-auto whitespace-pre-wrap break-all rounded bg-surface-3 p-1.5 font-mono text-[9px] leading-relaxed text-t3">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
              {totalErrors > errorLogs.length && (
                <p className="pt-1 text-center text-[10px] text-t3">
                  +{totalErrors - errorLogs.length} erori suplimentare — accesați tab-ul "Progres
                  pipeline" din pagina de detalii a importului.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* API unavailable notice */}
      {apiUnavailableError && (
        <div className="flex items-center gap-2">
          <HeartbeatDot state="unknown" />
          <span className="text-[10px] font-medium text-wa">
            Pipeline: status indisponibil temporar (API {apiUnavailableError.status})
          </span>
        </div>
      )}

      {/* Faza 1 — Ingest & Normalizare */}
      {hasIngestData && (
        <IngestPhaseStage
          batchStatus={batchStatus}
          processedRows={processedRows}
          totalRows={totalRows}
        />
      )}

      {/* Faza 2 — Re-rezolvare Identitate */}
      {reprocessJob ? (
        <ReprocessWorkerStage
          job={reprocessJob}
          onResume={handleResume}
          resumePending={resumeMutation.isPending}
          onResumeErrors={handleResumeErrors}
          resumeErrorsPending={resumeErrorsMutation.isPending}
          failedContactCount={failedContactCount}
        />
      ) : null}
      {!reprocessJob && hasReprocessHistory && !pipelineQuery.isPending && !pipeline ? (
        <PipelineStageRow
          label="Re-rezolvare Identitate"
          state={identityReprocessStatus ?? "unknown"}
        >
          <p className="mt-1 text-[10px] text-t3">
            {getReprocessFallbackMessage(identityReprocessStatus)}
          </p>
        </PipelineStageRow>
      ) : null}

      {/* Faza 3 — Promovare Contacte (paralel) */}
      {(hasPromotionActivity || (reprocessJob?.promotionQueued ?? 0) > 0) && (
        <PromotionQueueStage
          queue={promotionQueue}
          promotionQueued={reprocessJob?.promotionQueued ?? 0}
          metrics={pipeline?.promotionMetrics ?? null}
        />
      )}

      {/* Faza 4 — ANAF Enrichment */}
      <AnafPhaseStage metadata={metadata} runtimeProgress={pipeline?.anafProgress ?? null} />
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
  readonly onPause: (id: string) => Promise<void>;
  readonly onResume: (id: string, mode?: "resume" | "recover") => Promise<void>;
  readonly onCancel: (id: string) => Promise<void>;
  readonly onDelete: (id: string) => Promise<void>;
  readonly onImportRefetch: () => void;
};

type ImportRowActionsProps = {
  readonly id: string;
  readonly status: string;
  readonly control: Record<string, unknown>;
  readonly actionInProgress: string | null;
  readonly isReprocessActive: boolean;
  readonly onOpenMappingDialog: (id: string) => Promise<void>;
  readonly onRePromote: (id: string) => Promise<void>;
  readonly onAnafEnrich: (id: string) => Promise<void>;
  readonly onRetry: (id: string) => Promise<void>;
  readonly onPause: (id: string) => Promise<void>;
  readonly onResume: (id: string, mode?: "resume" | "recover") => Promise<void>;
  readonly onCancel: (id: string) => Promise<void>;
  readonly onDelete: (id: string) => Promise<void>;
  readonly className?: string;
};

type ImportRowCancelActionProps = ImportRowActionButtonProps & {
  readonly canCancel: boolean;
  readonly onCancel: (id: string) => Promise<void>;
};

function ImportRowCancelAction({
  id,
  actionInProgress,
  canCancel,
  onCancel,
}: ImportRowCancelActionProps) {
  if (!canCancel) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={actionInProgress !== null}
      onClick={async () => {
        await onCancel(id);
      }}
    >
      {actionInProgress === `cancel-${id}` ? "…" : "Anuleaza"}
    </Button>
  );
}

type ImportRowActionButtonProps = {
  readonly id: string;
  readonly actionInProgress: string | null;
};

type ImportRowAnafActionProps = ImportRowActionButtonProps & {
  readonly status: string;
  readonly onAnafEnrich: (id: string) => Promise<void>;
};

function ImportRowAnafAction({
  id,
  status,
  actionInProgress,
  onAnafEnrich,
}: ImportRowAnafActionProps) {
  if (status !== "completed") {
    return null;
  }

  return (
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
  );
}

type ImportRowRetryActionProps = ImportRowActionButtonProps & {
  readonly canRetry: boolean;
  readonly isReprocessActive: boolean;
  readonly onRetry: (id: string) => Promise<void>;
};

function ImportRowRetryAction({
  id,
  actionInProgress,
  canRetry,
  isReprocessActive,
  onRetry,
}: ImportRowRetryActionProps) {
  if (!canRetry) {
    return null;
  }

  return (
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
  );
}

type ImportRowPauseResumeActionProps = ImportRowActionButtonProps & {
  readonly batchPaused: boolean;
  readonly onPause: (id: string) => Promise<void>;
  readonly onResume: (id: string, mode?: "resume" | "recover") => Promise<void>;
};

function ImportRowPauseResumeAction({
  id,
  actionInProgress,
  batchPaused,
  onPause,
  onResume,
}: ImportRowPauseResumeActionProps) {
  if (batchPaused) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={actionInProgress !== null}
        onClick={async () => {
          await onResume(id, "recover");
        }}
      >
        {actionInProgress === `resume-batch-${id}` ? "…" : "Resume Import"}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={actionInProgress !== null}
      onClick={async () => {
        await onPause(id);
      }}
    >
      {actionInProgress === `pause-batch-${id}` ? "…" : "Pause"}
    </Button>
  );
}

type ImportRowDeleteActionProps = ImportRowActionButtonProps & {
  readonly canDelete: boolean;
  readonly onDelete: (id: string) => Promise<void>;
};

function ImportRowDeleteAction({
  id,
  actionInProgress,
  canDelete,
  onDelete,
}: ImportRowDeleteActionProps) {
  if (!canDelete) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={actionInProgress !== null}
      onClick={async () => {
        await onDelete(id);
      }}
    >
      {actionInProgress === `delete-${id}` ? "…" : "Delete"}
    </Button>
  );
}

function ImportRowActions({
  id,
  status,
  control,
  actionInProgress,
  isReprocessActive,
  onOpenMappingDialog,
  onRePromote,
  onAnafEnrich,
  onRetry,
  onPause,
  onResume,
  onCancel,
  onDelete,
  className,
}: ImportRowActionsProps) {
  const canRetry = ["pending", "failed", "cancelled"].includes(status);
  const canCancel = ["pending", "processing"].includes(status);
  const batchPaused = Boolean(control.batchPaused);
  // Orice batch vizibil în UI are hidden=false (API filtrează hidden=true la sursă).
  // Folosim `hidden` ca gate pentru canDelete, nu `deleteRequested`, astfel
  // un batch prins în starea de limbo (deleteRequested=true, hidden=false după
  // un delete eșuat parțial) poate fi reîncercat fără intervenție manuală în DB.
  const canDelete = !control.hidden;
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
      <ImportRowAnafAction
        id={id}
        status={status}
        actionInProgress={actionInProgress}
        onAnafEnrich={onAnafEnrich}
      />
      <ImportRowRetryAction
        id={id}
        actionInProgress={actionInProgress}
        canRetry={canRetry}
        isReprocessActive={isReprocessActive}
        onRetry={onRetry}
      />
      <ImportRowPauseResumeAction
        id={id}
        actionInProgress={actionInProgress}
        batchPaused={batchPaused}
        onPause={onPause}
        onResume={onResume}
      />
      <ImportRowCancelAction
        id={id}
        actionInProgress={actionInProgress}
        canCancel={canCancel}
        onCancel={onCancel}
      />
      <ImportRowDeleteAction
        id={id}
        actionInProgress={actionInProgress}
        canDelete={canDelete}
        onDelete={onDelete}
      />
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
  onPause,
  onResume,
  onCancel,
  onDelete,
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
  const historicalSummary =
    (imp.historicalSummary as Record<string, unknown> | undefined) ?? identitySummary;
  const latestAttemptSummary =
    (imp.latestAttemptSummary as Record<string, unknown> | undefined) ?? {};
  const quarantineSummary = (imp.quarantineSummary as Record<string, unknown> | undefined) ?? {};
  const control = (imp.control as Record<string, unknown> | undefined) ?? {};
  const identitySummaryLine = buildImportIdentitySummaryLine(historicalSummary);
  const latestAttemptLine = buildImportLatestAttemptLine(latestAttemptSummary, quarantineSummary);
  const identityReprocess = buildIdentityReprocessDisplay(metadata, total);

  return (
    <div key={id} className="py-4">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        {/* Metadata, identitate, progres secundar — ocupă lățimea disponibilă */}
        <div className="min-w-0 w-full flex-1 space-y-2">
          <p className="wrap-break-word text-sm font-medium leading-snug text-t1">
            {String(imp.filename ?? imp.id)}
          </p>
          <p className="text-xs text-t3">
            {progressLabel} · {timeLabel}
          </p>
          <p className="text-[10px] leading-relaxed text-t3 sm:text-[11px]">{latestAttemptLine}</p>
          <p className="text-[10px] leading-relaxed text-t3 sm:text-[11px]">
            {identitySummaryLine}
          </p>
          {identityReprocess.label ? (
            <p className="text-[10px] font-medium text-t2 sm:text-[11px]">
              {identityReprocess.label}
            </p>
          ) : null}
          {identityReprocess.metrics ? (
            <div className="mt-1 w-full max-w-full">
              <ProgressBar
                value={identityReprocess.metrics.progress}
                indeterminate={
                  identityReprocess.metrics.state === "running" &&
                  identityReprocess.metrics.totalRows <= 0
                }
              />
              {identityReprocess.details ? (
                <p className="mt-1 text-[10px] text-t3 sm:text-[11px]">
                  {identityReprocess.details}
                </p>
              ) : null}
            </div>
          ) : null}
          <PipelineProgressPanel
            batchId={id}
            batchStatus={status}
            processedRows={processed}
            totalRows={total}
            metadata={metadata}
            identityReprocessStatus={identityReprocess.status}
            failedContactCount={identityReprocess.failedContactCount}
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
            control={control}
            actionInProgress={actionInProgress}
            isReprocessActive={isIdentityReprocessActive(metadata)}
            onOpenMappingDialog={onOpenMappingDialog}
            onRePromote={onRePromote}
            onAnafEnrich={onAnafEnrich}
            onRetry={onRetry}
            onPause={onPause}
            onResume={onResume}
            onCancel={onCancel}
            onDelete={onDelete}
            className="w-full justify-start sm:justify-end lg:w-full lg:justify-start"
          />
        </div>
      </div>
    </div>
  );
}

type ImportTemplateCardProps = {
  readonly showColumns: boolean;
  readonly downloadingFormat: "csv" | "xlsx" | null;
  readonly columnsLoading: boolean;
  readonly columns: TemplateColumn[];
  readonly onToggleColumns: () => void;
  readonly onDownloadTemplate: (format: "csv" | "xlsx") => Promise<void>;
};

function ImportTemplateCard({
  showColumns,
  downloadingFormat,
  columnsLoading,
  columns,
  onToggleColumns,
  onDownloadTemplate,
}: ImportTemplateCardProps) {
  return (
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
            <Button variant="outline" size="sm" onClick={onToggleColumns}>
              {showColumns ? "Ascunde coloane" : "Vezi structura coloanelor"}
            </Button>
            <Button
              variant="brand"
              size="sm"
              disabled={downloadingFormat !== null}
              onClick={async () => {
                await onDownloadTemplate("csv");
              }}
            >
              {downloadingFormat === "csv" ? "Se descarcă…" : "Descarcă CSV"}
            </Button>
            <Button
              variant="brand"
              size="sm"
              disabled={downloadingFormat !== null}
              onClick={async () => {
                await onDownloadTemplate("xlsx");
              }}
            >
              {downloadingFormat === "xlsx" ? "Se descarcă…" : "Descarcă Excel"}
            </Button>
          </div>
        </div>
      </CardHeader>
      {showColumns && (
        <CardBody>
          {columnsLoading ? (
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
                firma, company, cif, vat, mail, etc.). Coloanele suplimentare sunt păstrate integral
                în datele brute.
              </p>
            </div>
          )}
        </CardBody>
      )}
    </Card>
  );
}

type ImportHistoryCardProps = {
  readonly imports: ImportRowRecord[];
  readonly isGlobalPaused: boolean;
  readonly actionInProgress: string | null;
  readonly onPauseGlobal: () => Promise<void>;
  readonly onResumeGlobal: () => Promise<void>;
  readonly onOpenMappingDialog: (id: string) => Promise<void>;
  readonly onRePromote: (id: string) => Promise<void>;
  readonly onAnafEnrich: (id: string) => Promise<void>;
  readonly onRetry: (id: string) => Promise<void>;
  readonly onPause: (id: string) => Promise<void>;
  readonly onResume: (id: string, mode?: "resume" | "recover") => Promise<void>;
  readonly onCancel: (id: string) => Promise<void>;
  readonly onDelete: (id: string) => Promise<void>;
  readonly onImportRefetch: () => void;
};

function ImportHistoryCard({
  imports,
  isGlobalPaused,
  actionInProgress,
  onPauseGlobal,
  onResumeGlobal,
  onOpenMappingDialog,
  onRePromote,
  onAnafEnrich,
  onRetry,
  onPause,
  onResume,
  onCancel,
  onDelete,
  onImportRefetch,
}: ImportHistoryCardProps) {
  return (
    <Card className="mt-6 min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Istoric Importuri</CardTitle>
            <p className="mt-1 text-xs text-t3">
              Control operațional live pentru importurile active și incomplete.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-t3">Global: {isGlobalPaused ? "Paused" : "Running"}</span>
            {isGlobalPaused ? (
              <Button
                variant="outline"
                size="sm"
                disabled={actionInProgress !== null}
                onClick={async () => {
                  await onResumeGlobal();
                }}
              >
                {actionInProgress === "resume-global" ? "…" : "Resume Global"}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={actionInProgress !== null}
                onClick={async () => {
                  await onPauseGlobal();
                }}
              >
                {actionInProgress === "pause-global" ? "…" : "Pause Global"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardBody className="min-w-0">
        <div className="min-w-0 space-y-0 divide-y divide-s700/60">
          {imports.length === 0 ? (
            <p className="py-4 text-center text-sm text-t3">
              Niciun import efectuat. Folosește template-ul de mai sus pentru a pregăti datele.
            </p>
          ) : (
            imports.map((imp) => (
              <ImportHistoryRow
                key={String(imp.id)}
                imp={imp}
                actionInProgress={actionInProgress}
                onOpenMappingDialog={onOpenMappingDialog}
                onRePromote={onRePromote}
                onAnafEnrich={onAnafEnrich}
                onRetry={onRetry}
                onPause={onPause}
                onResume={onResume}
                onCancel={onCancel}
                onDelete={onDelete}
                onImportRefetch={onImportRefetch}
              />
            ))
          )}
        </div>
      </CardBody>
    </Card>
  );
}

type ImportMappingDialogProps = {
  readonly mappingDialogId: string | null;
  readonly mappingLoading: boolean;
  readonly mappingHeaders: ImportHeaderSheet[];
  readonly allUniqueHeaders: string[];
  readonly targetOptions: MappingTargetOption[];
  readonly mappingState: Record<string, string>;
  readonly mappingSaving: boolean;
  readonly onClose: () => void;
  readonly onMappingChange: (header: string, value: string) => void;
  readonly onSave: () => Promise<void>;
  readonly onRePromote: (id: string) => Promise<void>;
};

function ImportMappingDialog({
  mappingDialogId,
  mappingLoading,
  mappingHeaders,
  allUniqueHeaders,
  targetOptions,
  mappingState,
  mappingSaving,
  onClose,
  onMappingChange,
  onSave,
  onRePromote,
}: ImportMappingDialogProps) {
  return (
    <Dialog
      open={mappingDialogId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
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
                {mappingHeaders.map((sheet) => sheet.sheetName).join(", ")}
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
                        onValueChange={(value) => onMappingChange(header, value)}
                        placeholder="Selectează câmpul..."
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex justify-end gap-2 border-t border-s700 pt-4">
              <Button variant="outline" size="sm" onClick={onClose} disabled={mappingSaving}>
                Anulează
              </Button>
              <Button
                variant="brand"
                size="sm"
                onClick={async () => {
                  await onSave();
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
                    await onRePromote(mappingDialogId);
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
  );
}

type ImportPageContentProps = {
  readonly showColumns: boolean;
  readonly downloadingFormat: "csv" | "xlsx" | null;
  readonly columnsLoading: boolean;
  readonly columns: TemplateColumn[];
  readonly onToggleColumns: () => void;
  readonly onDownloadTemplate: (format: "csv" | "xlsx") => Promise<void>;
  readonly onUploadSelection: (files: FileSelection) => void;
  readonly uploadMessage: string;
  readonly showRefetchWarning: boolean;
  readonly isGlobalPaused: boolean;
  readonly actionInProgress: string | null;
  readonly imports: ImportRowRecord[];
  readonly onPauseGlobal: () => Promise<void>;
  readonly onResumeGlobal: () => Promise<void>;
  readonly onOpenMappingDialog: (id: string) => Promise<void>;
  readonly onRePromote: (id: string) => Promise<void>;
  readonly onAnafEnrich: (id: string) => Promise<void>;
  readonly onRetry: (id: string) => Promise<void>;
  readonly onPauseImportBatch: (id: string) => Promise<void>;
  readonly onResumeImportBatch: (id: string, mode?: "resume" | "recover") => Promise<void>;
  readonly onCancelImportBatch: (id: string) => Promise<void>;
  readonly onDeleteImportBatch: (id: string) => Promise<void>;
  readonly onImportRefetch: () => void;
  readonly mappingDialogId: string | null;
  readonly mappingLoading: boolean;
  readonly mappingHeaders: ImportHeaderSheet[];
  readonly allUniqueHeaders: string[];
  readonly targetOptions: MappingTargetOption[];
  readonly mappingState: Record<string, string>;
  readonly mappingSaving: boolean;
  readonly onCloseMappingDialog: () => void;
  readonly onMappingChange: (header: string, value: string) => void;
  readonly onSaveMapping: () => Promise<void>;
};

function ImportPageContent({
  showColumns,
  downloadingFormat,
  columnsLoading,
  columns,
  onToggleColumns,
  onDownloadTemplate,
  onUploadSelection,
  uploadMessage,
  showRefetchWarning,
  isGlobalPaused,
  actionInProgress,
  imports,
  onPauseGlobal,
  onResumeGlobal,
  onOpenMappingDialog,
  onRePromote,
  onAnafEnrich,
  onRetry,
  onPauseImportBatch,
  onResumeImportBatch,
  onCancelImportBatch,
  onDeleteImportBatch,
  onImportRefetch,
  mappingDialogId,
  mappingLoading,
  mappingHeaders,
  allUniqueHeaders,
  targetOptions,
  mappingState,
  mappingSaving,
  onCloseMappingDialog,
  onMappingChange,
  onSaveMapping,
}: ImportPageContentProps) {
  return (
    <PageWrapper title="Import Contacte">
      <ImportTemplateCard
        showColumns={showColumns}
        downloadingFormat={downloadingFormat}
        columnsLoading={columnsLoading}
        columns={columns}
        onToggleColumns={onToggleColumns}
        onDownloadTemplate={onDownloadTemplate}
      />

      <FileUpload
        accept={ACCEPT}
        multiple
        onFilesSelected={onUploadSelection}
        label="Trage fișiere CSV sau Excel aici"
      />
      {uploadMessage ? <p className="mt-3 text-xs text-ok">{uploadMessage}</p> : null}
      {showRefetchWarning ? (
        <p className="mt-2 text-xs text-wa">
          API import este indisponibil temporar. Ultimele date afișate rămân vizibile, iar poll-ul a
          trecut pe backoff.
        </p>
      ) : null}

      <ImportHistoryCard
        imports={imports}
        isGlobalPaused={isGlobalPaused}
        actionInProgress={actionInProgress}
        onPauseGlobal={onPauseGlobal}
        onResumeGlobal={onResumeGlobal}
        onOpenMappingDialog={onOpenMappingDialog}
        onRePromote={onRePromote}
        onAnafEnrich={onAnafEnrich}
        onRetry={onRetry}
        onPause={onPauseImportBatch}
        onResume={onResumeImportBatch}
        onCancel={onCancelImportBatch}
        onDelete={onDeleteImportBatch}
        onImportRefetch={onImportRefetch}
      />

      <ImportMappingDialog
        mappingDialogId={mappingDialogId}
        mappingLoading={mappingLoading}
        mappingHeaders={mappingHeaders}
        allUniqueHeaders={allUniqueHeaders}
        targetOptions={targetOptions}
        mappingState={mappingState}
        mappingSaving={mappingSaving}
        onClose={onCloseMappingDialog}
        onMappingChange={onMappingChange}
        onSave={onSaveMapping}
        onRePromote={onRePromote}
      />
    </PageWrapper>
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
  const [mappingHeaders, setMappingHeaders] = useState<ImportHeaderSheet[]>([]);
  const [mappingTargets, setMappingTargets] = useState<MappingTarget[]>([]);

  const importsQuery = useQuery({
    queryKey: ["etapa1", "imports"],
    queryFn: () => fetchImports({ limit: 25, offset: 0 }),
    refetchInterval: (query) => resolveImportsRefetchInterval(query.state),
    refetchIntervalInBackground: true,
    retry: shouldRetryImportsQuery,
  });
  const importControlQuery = useImportControl();
  const pauseGlobalMutation = usePauseImportsGlobal();
  const resumeGlobalMutation = useResumeImportsGlobal();
  const pauseBatchMutation = usePauseImportBatch();
  const resumeBatchMutation = useResumeImportBatch();
  const cancelBatchMutation = useCancelImport();
  const deleteBatchMutation = useDeleteImportBatch();
  const globalControl = importControlQuery.data?.data;

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

    await runImportMessageAction({
      action: async () => {
        await uploadMutation.mutateAsync(firstFile);
        setUploadMessage(`Fișier încărcat: ${firstFile.name}`);
      },
      fallbackErrorMessage: "Eroare la încărcarea fișierului.",
      setUploadMessage,
    });
  };

  const handleDownloadTemplate = async (format: "csv" | "xlsx") => {
    setDownloadingFormat(format);
    try {
      await runImportMessageAction({
        action: () => downloadImportTemplate(format),
        fallbackErrorMessage: "Eroare la descărcarea template-ului.",
        setUploadMessage,
      });
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleRetry = async (id: string) => {
    await runTrackedImportAction({
      actionKey: `retry-${id}`,
      action: async () => {
        await retryImport(id);
        await importsQuery.refetch();
      },
      fallbackErrorMessage: "Eroare la reluarea importului.",
      setActionInProgress,
      setUploadMessage,
    });
  };

  const handlePauseGlobal = async () => {
    await runTrackedImportAction({
      actionKey: "pause-global",
      action: async () => {
        await pauseGlobalMutation.mutateAsync();
        await Promise.all([importsQuery.refetch(), importControlQuery.refetch()]);
      },
      fallbackErrorMessage: "Eroare la punerea globală pe pauză.",
      setActionInProgress,
      setUploadMessage,
    });
  };

  const handleResumeGlobal = async () => {
    await runTrackedImportAction({
      actionKey: "resume-global",
      action: async () => {
        await resumeGlobalMutation.mutateAsync("recover");
        await Promise.all([importsQuery.refetch(), importControlQuery.refetch()]);
      },
      fallbackErrorMessage: "Eroare la reluarea globală.",
      setActionInProgress,
      setUploadMessage,
    });
  };

  const handlePauseImportBatch = async (id: string) => {
    await runTrackedImportAction({
      actionKey: `pause-batch-${id}`,
      action: async () => {
        await pauseBatchMutation.mutateAsync(id);
        await importsQuery.refetch();
      },
      fallbackErrorMessage: "Eroare la pauzarea importului.",
      setActionInProgress,
      setUploadMessage,
    });
  };

  const handleResumeImportBatch = async (id: string, mode: "resume" | "recover" = "recover") => {
    await runTrackedImportAction({
      actionKey: `resume-batch-${id}`,
      action: async () => {
        await resumeBatchMutation.mutateAsync({ batchId: id, mode });
        await importsQuery.refetch();
      },
      fallbackErrorMessage: "Eroare la reluarea importului.",
      setActionInProgress,
      setUploadMessage,
    });
  };

  const handleDeleteImportBatch = async (id: string) => {
    await runTrackedImportAction({
      actionKey: `delete-${id}`,
      action: async () => {
        await deleteBatchMutation.mutateAsync(id);
        await importsQuery.refetch();
      },
      fallbackErrorMessage: "Eroare la ștergerea importului.",
      setActionInProgress,
      setUploadMessage,
    });
  };

  const handleCancelImportBatch = async (id: string) => {
    await runTrackedImportAction({
      actionKey: `cancel-${id}`,
      action: async () => {
        await cancelBatchMutation.mutateAsync(id);
        await importsQuery.refetch();
      },
      fallbackErrorMessage: "Eroare la anularea importului.",
      setActionInProgress,
      setUploadMessage,
    });
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
    await runTrackedImportAction({
      actionKey: `repromote-${id}`,
      action: async () => {
        const result = await rePromoteImport(id);
        const data = result?.data as Record<string, unknown> | undefined;
        setUploadMessage(
          data?.alreadyQueued
            ? "Re-promovare deja în curs. Așteaptă finalizarea job-ului existent."
            : "Re-rezolvare identitate + promovare Bronze→Silver programate.",
        );
        await importsQuery.refetch();
      },
      fallbackErrorMessage: "Eroare la re-promovare.",
      setActionInProgress,
      setUploadMessage,
    });
  };

  const handleAnafEnrich = async (id: string) => {
    await runTrackedImportAction({
      actionKey: `anaf-${id}`,
      action: async () => {
        const result = await anafEnrichImport(id);
        const data = result?.data as Record<string, unknown> | undefined;
        const queued = Number(data?.queued ?? 0);
        setUploadMessage(
          queued === 0
            ? "Toate contactele au fost deja îmbogățite ANAF."
            : `${queued} CUI-uri trimise la ANAF pentru îmbogățire.`,
        );
        await importsQuery.refetch();
      },
      fallbackErrorMessage: "Eroare la îmbogățirea ANAF.",
      setActionInProgress,
      setUploadMessage,
    });
  };

  const imports = importsQuery.data?.data ?? [];
  const importsRefetchUnavailableError = isTransientApiUnavailable(importsQuery.error)
    ? importsQuery.error
    : null;
  const columns = (columnsQuery.data?.data ?? []) as TemplateColumn[];

  const allUniqueHeaders = Array.from(new Set(mappingHeaders.flatMap((s) => s.headers)));
  const targetOptions: MappingTargetOption[] = [
    { value: UNMAPPED_VALUE, label: "— Nu mapa (păstrează original) —" },
    ...mappingTargets.map((t) => ({ value: t.key, label: t.label })),
  ];
  const handleImportRefetch = useCallback(() => {
    importsQuery.refetch().catch(() => undefined);
  }, [importsQuery]);
  const closeMappingDialog = useCallback(() => {
    setMappingDialogId(null);
  }, []);
  const handleMappingChange = useCallback((header: string, value: string) => {
    setMappingState((prev) => ({ ...prev, [header]: value }));
  }, []);

  const handleUploadSelection = (files: FileSelection) => {
    handleFiles(files).catch((error: unknown) => {
      setUploadMessage(toUiErrorMessage(error, "Eroare la încărcarea fișierului."));
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
          Eroare la încărcarea datelor: {toUiErrorMessage(importsQuery.error, "Eroare necunoscută")}
        </div>
      </PageWrapper>
    );
  }

  return (
    <ImportPageContent
      showColumns={showColumns}
      downloadingFormat={downloadingFormat}
      columnsLoading={columnsQuery.isPending}
      columns={columns}
      onToggleColumns={() => setShowColumns((value) => !value)}
      onDownloadTemplate={handleDownloadTemplate}
      onUploadSelection={handleUploadSelection}
      uploadMessage={uploadMessage}
      showRefetchWarning={importsQuery.isRefetchError && Boolean(importsRefetchUnavailableError)}
      isGlobalPaused={Boolean(globalControl?.globalPaused)}
      actionInProgress={actionInProgress}
      imports={imports}
      onPauseGlobal={handlePauseGlobal}
      onResumeGlobal={handleResumeGlobal}
      onOpenMappingDialog={openMappingDialog}
      onRePromote={handleRePromote}
      onAnafEnrich={handleAnafEnrich}
      onRetry={handleRetry}
      onPauseImportBatch={handlePauseImportBatch}
      onResumeImportBatch={handleResumeImportBatch}
      onCancelImportBatch={handleCancelImportBatch}
      onDeleteImportBatch={handleDeleteImportBatch}
      onImportRefetch={handleImportRefetch}
      mappingDialogId={mappingDialogId}
      mappingLoading={mappingLoading}
      mappingHeaders={mappingHeaders}
      allUniqueHeaders={allUniqueHeaders}
      targetOptions={targetOptions}
      mappingState={mappingState}
      mappingSaving={mappingSaving}
      onCloseMappingDialog={closeMappingDialog}
      onMappingChange={handleMappingChange}
      onSaveMapping={handleSaveMapping}
    />
  );
}
