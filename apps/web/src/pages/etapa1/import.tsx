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
} from "@/lib/etapa1-api.js";
import type { MappingTarget } from "@/lib/etapa1-api.js";
import { FileUpload } from "@/components/forms/FileUpload.js";
import { Button } from "@/components/ui/button.js";
import { Select } from "@/components/ui/select.js";
import { Dialog, DialogContent } from "@/components/ui/dialog.js";

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
    return "text-(--color-danger)";
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

function getIdentityReprocessMetrics(metadata: Record<string, unknown>, totalRows: number) {
  const state = getIdentityReprocessState(metadata);
  if (!state) {
    return null;
  }

  const processedRows = Number(metadata.identityReprocessProcessedRows ?? 0);
  const resolvedRows = Number(metadata.identityReprocessResolvedRows ?? 0);
  const total = Math.max(totalRows, processedRows, 0);
  const progress = total > 0 ? Math.min(100, Math.round((processedRows / total) * 100)) : 0;
  const startedAtRaw =
    typeof metadata.identityReprocessStartedAt === "string"
      ? metadata.identityReprocessStartedAt
      : null;
  const lastProgressAtRaw =
    typeof metadata.identityReprocessLastProgressAt === "string"
      ? metadata.identityReprocessLastProgressAt
      : null;
  const startedAt = startedAtRaw ? Date.parse(startedAtRaw) : Number.NaN;
  const referenceNow = lastProgressAtRaw ? Date.parse(lastProgressAtRaw) : Date.now();
  const elapsedMs =
    Number.isFinite(startedAt) && referenceNow > startedAt ? referenceNow - startedAt : null;
  const throughput = elapsedMs && processedRows > 0 ? processedRows / (elapsedMs / 1000) : null;
  const remainingRows = total > processedRows ? total - processedRows : 0;
  const etaMs = throughput && remainingRows > 0 ? (remainingRows / throughput) * 1000 : null;

  return {
    state,
    processedRows,
    resolvedRows,
    totalRows: total,
    progress,
    throughput,
    etaMs,
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

  return `Re-rezolvare identitate: finalizată (${metrics.resolvedRows.toLocaleString("ro-RO")} rânduri rezolvate)`;
}

function isIdentityReprocessActive(metadata: Record<string, unknown>) {
  const state = getIdentityReprocessState(metadata);
  return state === "queued" || state === "running";
}

function RequiredBadge({ required }: { required: boolean }) {
  return required ? (
    <span className="inline-flex items-center rounded-full bg-(--color-danger)/15 px-2 py-0.5 text-[10px] font-semibold text-(--color-danger)">
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
  imp: Record<string, unknown>;
  actionInProgress: string | null;
  onOpenMappingDialog: (id: string) => Promise<void>;
  onRePromote: (id: string) => Promise<void>;
  onRetry: (id: string) => Promise<void>;
};

function ImportHistoryRow({
  imp,
  actionInProgress,
  onOpenMappingDialog,
  onRePromote,
  onRetry,
}: Readonly<ImportRowProps>) {
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
  const canRetry = ["pending", "failed", "cancelled"].includes(status);
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
    <div key={id} className="flex items-center gap-4 border-b border-s700 py-2 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-t1">{String(imp.filename ?? imp.id)}</p>
        <p className="text-xs text-t3">
          {progressLabel} · {timeLabel}
        </p>
        <p className="mt-1 text-[10px] text-t3">
          {`Entități rezolvate: ${resolvedCompanies} · Duplicate sursă: ${duplicateSourceRows} · Conflicte identitate: ${identityConflictRows}`}
        </p>
        {identityReprocessLabel ? (
          <p className="mt-1 text-[10px] font-medium text-t2">{identityReprocessLabel}</p>
        ) : null}
        {identityReprocessMetrics ? (
          <div className="mt-1 max-w-xl">
            <ProgressBar
              value={identityReprocessMetrics.progress}
              indeterminate={
                identityReprocessMetrics.state === "running" &&
                identityReprocessMetrics.totalRows <= 0
              }
            />
            {identityReprocessDetails ? (
              <p className="mt-1 text-[10px] text-t3">{identityReprocessDetails}</p>
            ) : null}
          </div>
        ) : null}
        {lastError && status === "failed" ? (
          <p className="mt-1 line-clamp-2 text-xs text-(--color-danger)">{lastError}</p>
        ) : null}
      </div>
      <div className="w-32">
        <ProgressBar value={progress} indeterminate={isProcessing && !hasKnownTotal} />
      </div>
      <span className={`w-20 text-xs font-medium ${getStatusToneClass(status)}`}>{status}</span>
      <div className="flex shrink-0 items-center gap-1.5">
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
          disabled={actionInProgress !== null}
          onClick={async () => {
            await onRePromote(id);
          }}
        >
          {actionInProgress === `repromote-${id}` ? "…" : "Re-promoveaza"}
        </Button>
        {canRetry ? (
          <Button
            variant="outline"
            size="sm"
            disabled={actionInProgress !== null}
            onClick={async () => {
              await onRetry(id);
            }}
          >
            {actionInProgress === `retry-${id}` ? "…" : "Resume"}
          </Button>
        ) : null}
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
      await rePromoteImport(id);
      setUploadMessage("Re-rezolvare identitate + promovare Bronze→Silver programate.");
      await importsQuery.refetch();
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : "Eroare la re-promovare.");
    } finally {
      setActionInProgress(null);
    }
  };

  const imports = importsQuery.data?.data ?? [];
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
        <div className="rounded-lg border border-(--color-danger)/30 bg-(--color-danger)/10 p-4 text-sm text-(--color-danger)">
          Eroare la încărcarea datelor: {importsQuery.error?.message ?? "Eroare necunoscută"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Import Contacte">
      {/* Template section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Template Import</CardTitle>
              <p className="mt-1 text-xs text-t3">
                Descarcă template-ul (CSV sau Excel) cu toate coloanele necesare pentru un import
                corect. Fișierul Excel include și o foaie cu instrucțiuni detaliate.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
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

      {/* Import history */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Istoric Importuri</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
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
                  onRetry={handleRetry}
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
