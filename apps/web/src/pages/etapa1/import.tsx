import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/index.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { fetchImports, uploadImport } from "@/lib/etapa1-api.js";
import { FileUpload } from "@/components/forms/FileUpload.js";

const ACCEPT =
  ".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";

export function Import() {
  const [uploadMessage, setUploadMessage] = useState("");
  const importsQuery = useQuery({
    queryKey: ["etapa1", "imports"],
    queryFn: () => fetchImports({ limit: 25, offset: 0 }),
  });
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadImport(file),
    onSuccess: () => {
      void importsQuery.refetch();
    },
  });

  const handleFiles = (files: FileList | File[] | null) => {
    const list = files ? (Array.isArray(files) ? files : Array.from(files)) : [];
    const allowed = list.length
      ? list.filter(
          (f) =>
            f.name.endsWith(".csv") ||
            f.name.endsWith(".xlsx") ||
            f.name.endsWith(".xls") ||
            f.type === "text/csv" ||
            f.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
      : [];
    if (allowed.length) {
      void uploadMutation.mutateAsync(allowed[0]).then(() => {
        setUploadMessage(`Fisier incarcat: ${allowed[0].name}`);
      });
    }
  };

  const imports = importsQuery.data?.data ?? [];

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
        <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-4 text-sm text-[var(--color-danger)]">
          Eroare la încărcarea datelor: {importsQuery.error?.message ?? "Eroare necunoscută"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Import Contacte">
      <FileUpload
        accept={ACCEPT}
        multiple
        onFilesSelected={(files) => handleFiles(files)}
        label="Trage fișiere CSV sau Excel aici"
      />
      {uploadMessage ? (
        <p className="mt-3 text-xs text-[var(--color-ok)]">{uploadMessage}</p>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Istoric Importuri</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {imports.map((imp: Record<string, unknown>) => {
              const processed = Number(imp.processedRows ?? 0);
              const total = Number(imp.totalRows ?? 0);
              const progress = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
              return (
                <div
                  key={String(imp.id)}
                  className="flex items-center gap-4 py-2 border-b border-[var(--color-s700)] last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-t1)] truncate">
                      {String(imp.filename ?? imp.id)}
                    </p>
                    <p className="text-xs text-[var(--color-t3)]">
                      {total} rânduri · {new Date(String(imp.createdAt)).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-32">
                    <ProgressBar value={progress} />
                  </div>
                  <span className="text-xs text-[var(--color-t2)] w-20">{String(imp.status)}</span>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
