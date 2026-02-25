import { useRef, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Button, Card, CardHeader, CardTitle, CardBody } from "@/components/ui/index.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { cn } from "@/lib/utils.js";

const MOCK_IMPORTS = [
  {
    id: "1",
    name: "contacte_ian2025.csv",
    rows: 2345,
    progress: 100,
    status: "Complet",
    date: "22 feb 2025",
  },
  {
    id: "2",
    name: "firme_dolj.xlsx",
    rows: 1200,
    progress: 67,
    status: "În curs",
    date: "21 feb 2025",
  },
  {
    id: "3",
    name: "ouai_ialomita.csv",
    rows: 890,
    progress: 23,
    status: "În curs",
    date: "20 feb 2025",
  },
];

const ACCEPT =
  ".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";

export function Import() {
  const [drag, setDrag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      // TODO Etapa 1: upload la API / preprocesare
      console.info(
        "Import files selected:",
        allowed.map((f) => f.name),
      );
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    handleFiles(e.dataTransfer?.files ?? null);
  };

  return (
    <PageWrapper title="Import Contacte">
      <input
        type="file"
        ref={fileInputRef}
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div
        className={cn(
          "border-2 border-dashed rounded-[var(--radius-lg)] p-12 text-center transition-colors",
          drag
            ? "border-[var(--color-b5)] bg-[var(--color-b5)]/5"
            : "border-[var(--color-s600)] bg-[var(--color-s900)]/50",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        <p className="text-[var(--color-t2)] mb-4">Trage fișiere CSV sau Excel aici</p>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          Browse Files
        </Button>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Istoric Importuri</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {MOCK_IMPORTS.map((imp) => (
              <div
                key={imp.id}
                className="flex items-center gap-4 py-2 border-b border-[var(--color-s700)] last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-t1)] truncate">{imp.name}</p>
                  <p className="text-xs text-[var(--color-t3)]">
                    {imp.rows} rânduri · {imp.date}
                  </p>
                </div>
                <div className="w-32">
                  <ProgressBar value={imp.progress} />
                </div>
                <span className="text-xs text-[var(--color-t2)] w-20">{imp.status}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
