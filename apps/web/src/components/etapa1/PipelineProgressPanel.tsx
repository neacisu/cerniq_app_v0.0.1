import { useState } from "react";
import { Spinner } from "@/components/ui/spinner.js";
import { Badge } from "@/components/ui/badge.js";
import { Select } from "@/components/ui/select.js";
import { useImportJobLogs } from "@/hooks/use-etapa1.js";
import type { JobLog, JobLogLevel } from "@/lib/etapa1-api.js";

// ── Constants ────────────────────────────────────────────────────────────────

const WORKER_ORDER = [
  "A1:csv-parser",
  "A2:excel-parser",
  "A3:webhook-receiver",
  "A4:api-poller",
  "A5:manual-entry",
  "B1:name-normalizer",
  "B2:email-normalizer",
  "B3:phone-normalizer",
  "B4:address-normalizer",
  "B5:anaf-bronze-enricher",
  "C1:cui-modulo11",
  "C2:cui-anaf-validator",
  "promotion:bronze-silver",
];

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTs(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ── Worker Summary Row ────────────────────────────────────────────────────────

type WorkerStats = {
  step: number;
  info: number;
  warn: number;
  error: number;
  total: number;
};

function buildWorkerStats(logs: JobLog[]): Map<string, WorkerStats> {
  const map = new Map<string, WorkerStats>();
  for (const log of logs) {
    const stats = map.get(log.workerName) ?? { step: 0, info: 0, warn: 0, error: 0, total: 0 };
    const lv = log.level as keyof Omit<WorkerStats, "total">;
    stats[lv] = stats[lv] + 1;
    stats.total += 1;
    map.set(log.workerName, stats);
  }
  return map;
}

function WorkerSummary({ logs }: Readonly<{ logs: JobLog[] }>) {
  const stats = buildWorkerStats(logs);
  const workers = WORKER_ORDER.filter((w) => stats.has(w)).concat(
    [...stats.keys()].filter((w) => !WORKER_ORDER.includes(w)),
  );

  if (workers.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {workers.map((worker) => {
        const s = stats.get(worker);
        if (!s) return null;
        return (
          <div
            key={worker}
            className="inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs bg-surface-2"
          >
            <span className="font-medium text-t1">{worker}</span>
            <span className="text-t3">·</span>
            {s.step > 0 && <span className="text-violet-600 font-semibold">{s.step} pași</span>}
            {s.info > 0 && <span className="text-sky-600">{s.info} info</span>}
            {s.warn > 0 && <span className="text-amber-600 font-semibold">{s.warn} ⚠</span>}
            {s.error > 0 && <span className="text-red-600 font-bold">{s.error} ✗</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── Log Entry ─────────────────────────────────────────────────────────────────

function LogEntry({ log }: Readonly<{ log: JobLog }>) {
  const [expanded, setExpanded] = useState(log.level === "error");
  const hasDetails = log.details && Object.keys(log.details).length > 0;

  return (
    <div className={`pl-3 pr-2 py-1.5 rounded-sm mb-0.5 ${LEVEL_ROW_CLASS[log.level]}`}>
      <div className="flex items-start gap-2">
        <span className="shrink-0 text-[10px] text-t3 tabular-nums mt-0.5 w-16">
          {formatTs(log.createdAt)}
        </span>
        <Badge variant={LEVEL_BADGE_VARIANT[log.level]}>{log.level.toUpperCase()}</Badge>
        <span className="shrink-0 text-[10px] text-t3 bg-surface-3 px-1 rounded mt-0.5">
          {log.workerName}
        </span>
        <span className="text-[10px] text-t3 mt-0.5 shrink-0">[{log.step}]</span>
        <span className="text-xs text-t1 flex-1 leading-snug">
          {log.message}
          {log.durationMs != null && (
            <span className="ml-2 text-[10px] text-t3">({log.durationMs}ms)</span>
          )}
        </span>
        {hasDetails && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 text-[10px] text-sky-500 underline mt-0.5"
            type="button"
          >
            {expanded ? "▲ detalii" : "▼ detalii"}
          </button>
        )}
      </div>
      {expanded && hasDetails && (
        <pre className="mt-1.5 ml-16 text-[10px] text-t2 bg-surface-3 rounded p-2 overflow-x-auto max-h-48">
          {JSON.stringify(log.details, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ── Error Summary ────────────────────────────────────────────────────────────

function ErrorSummaryPanel({ logs, total }: Readonly<{ logs: JobLog[]; total: number }>) {
  const errors = logs.filter((l) => l.level === "error");
  if (errors.length === 0) return null;
  return (
    <div className="rounded-md border border-er/30 bg-er/8 px-3 py-2 space-y-1.5">
      <p className="text-[11px] font-semibold text-er flex flex-wrap items-center gap-2">
        <span>
          ✗ {total} {total === 1 ? "eroare" : "erori"} detectate în pipeline
        </span>
        {total > errors.length && (
          <span className="text-[10px] font-normal text-t3">
            (primele {errors.length} afișate mai jos)
          </span>
        )}
      </p>
      <div className="space-y-1 max-h-56 overflow-y-auto">
        {errors.map((log) => (
          <div key={log.id} className="rounded-sm border border-er/20 bg-er/5 px-2 py-1.5">
            <div className="flex flex-wrap items-start gap-1.5">
              <span className="mt-0.5 shrink-0 tabular-nums text-[9px] text-t3">
                {formatTs(log.createdAt)}
              </span>
              <span className="mt-0.5 shrink-0 rounded bg-surface-3 px-1 font-mono text-[9px] text-t3">
                {log.workerName}
              </span>
              <span className="mt-0.5 shrink-0 text-[9px] text-t3">[{log.step}]</span>
              <span className="flex-1 text-[10px] font-medium leading-snug text-er">
                {log.message}
                {log.durationMs != null && (
                  <span className="ml-2 text-[9px] font-normal text-t3">({log.durationMs}ms)</span>
                )}
              </span>
            </div>
            {log.details != null && Object.keys(log.details).length > 0 && (
              <pre className="mt-1 max-h-28 overflow-x-auto whitespace-pre-wrap break-all rounded bg-surface-3 p-1.5 font-mono text-[9px] leading-relaxed text-t3">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

const LEVEL_OPTIONS = [
  { value: "", label: "Toate nivelele" },
  { value: "step", label: "🎯 Pași principali" },
  { value: "info", label: "ℹ Info" },
  { value: "warn", label: "⚠ Avertismente" },
  { value: "error", label: "✗ Erori" },
];

const WORKER_OPTIONS = [
  { value: "", label: "Toți workerii" },
  ...WORKER_ORDER.map((w) => ({ value: w, label: w })),
];

type Props = {
  batchId: string;
  isActive: boolean;
};

function EmptyState({ isActive }: Readonly<{ isActive: boolean }>) {
  if (isActive) {
    return (
      <div className="py-10 text-center text-sm text-t3">
        Așteptând primele log-uri de la workeri…
      </div>
    );
  }
  return (
    <div className="py-10 text-center text-sm text-t3">Nu există log-uri pentru acest import.</div>
  );
}

export function PipelineProgressPanel({ batchId, isActive }: Readonly<Props>) {
  const [levelFilter, setLevelFilter] = useState<string>("");
  const [workerFilter, setWorkerFilter] = useState<string>("");

  const logsQuery = useImportJobLogs(batchId, {
    level: levelFilter ? (levelFilter as JobLogLevel) : undefined,
    worker: workerFilter || undefined,
    limit: 500,
    isActive,
  });

  const logs = (logsQuery.data?.data ?? []) as JobLog[];
  const total = logsQuery.data?.meta?.total ?? 0;

  const errorCount = logs.filter((l) => l.level === "error").length;
  const warnCount = logs.filter((l) => l.level === "warn").length;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-44">
          <Select
            value={levelFilter}
            onValueChange={(v) => setLevelFilter(v)}
            options={LEVEL_OPTIONS}
          />
        </div>
        <div className="w-52">
          <Select
            value={workerFilter}
            onValueChange={(v) => setWorkerFilter(v)}
            options={WORKER_OPTIONS}
          />
        </div>
        <span className="text-xs text-t3">
          {total} intrări totale
          {errorCount > 0 && (
            <span className="ml-2 text-red-600 font-semibold">· {errorCount} erori</span>
          )}
          {warnCount > 0 && (
            <span className="ml-2 text-amber-600 font-semibold">· {warnCount} avertismente</span>
          )}
        </span>
        {isActive && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-sky-600">
            <span className="inline-block w-2 h-2 rounded-full bg-sky-500 animate-pulse" />{" "}
            Actualizare live (3s)
          </span>
        )}
      </div>

      {/* Error summary — shown always when there are errors */}
      {!levelFilter && !workerFilter && <ErrorSummaryPanel logs={logs} total={errorCount} />}

      {/* Worker summary chips */}
      {!levelFilter && !workerFilter && <WorkerSummary logs={logs} />}

      {/* Log list */}
      {logsQuery.isPending && (
        <div className="flex justify-center py-10">
          <Spinner size={24} />
        </div>
      )}
      {!logsQuery.isPending && logs.length === 0 && <EmptyState isActive={isActive} />}
      {!logsQuery.isPending && logs.length > 0 && (
        <div className="font-mono">
          {logs.map((log) => (
            <LogEntry key={log.id} log={log} />
          ))}
          {total > logs.length && (
            <div className="py-2 text-center text-xs text-t3">
              Afișate {logs.length} din {total} intrări. Folosiți filtrele pentru a restrânge.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
