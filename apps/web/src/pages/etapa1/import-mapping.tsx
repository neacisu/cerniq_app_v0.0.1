import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
import { ImportMappingForm } from "@/components/forms/ImportMappingForm.js";
import { toast } from "@/components/ui/toast-api.js";
import { useImportDetail, useMappingTargets, useSaveImportMapping } from "@/hooks/use-etapa1.js";
import type { ImportMappingConfig } from "@/components/forms/ImportMappingForm.js";

export function ImportMapping() {
  const { id } = useParams();
  const detailQuery = useImportDetail(id);
  const targetsQuery = useMappingTargets();
  const saveMutation = useSaveImportMapping(id);
  const item = detailQuery.data?.data ?? {};
  const uploadConfig =
    ((item.metadata as Record<string, unknown> | undefined)?.uploadConfig as
      | Record<string, unknown>
      | undefined) ?? {};
  const sourceColumns = useMemo(() => {
    const mapping = uploadConfig.mapping;
    if (mapping && typeof mapping === "object") {
      return Object.keys(mapping as Record<string, string>);
    }
    return [];
  }, [uploadConfig.mapping]);

  const targetFields = useMemo(() => {
    const raw = targetsQuery.data?.data ?? [];
    return (raw as Array<{ key: string; label: string }>).map((t) => ({
      label: t.label,
      value: t.key,
    }));
  }, [targetsQuery.data]);

  const handleSubmit = async (config: ImportMappingConfig) => {
    try {
      await saveMutation.mutateAsync(config.mappings);
      toast.success("Mapping salvat cu succes");
    } catch {
      toast.error("Eroare la salvarea mapping-ului");
    }
  };

  if (detailQuery.isPending || targetsQuery.isPending) {
    return (
      <PageWrapper title="Import Mapping">
        <div className="flex items-center justify-center py-12">
          <Spinner size={32} />
        </div>
      </PageWrapper>
    );
  }

  if (detailQuery.isError) {
    return (
      <PageWrapper title="Import Mapping">
        <div className="rounded-lg border border-er/30 bg-er/10 p-4 text-sm text-er">
          Eroare la încărcarea datelor: {detailQuery.error?.message ?? "Eroare necunoscută"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Import Mapping"
      subtitle={`Import: ${String(item.filename ?? id ?? "-")} · encoding: ${typeof uploadConfig.encoding === "string" ? uploadConfig.encoding : "utf-8"}`}
    >
      <ImportMappingForm
        sourceColumns={sourceColumns}
        targetFields={targetFields}
        initial={{
          delimiter: (uploadConfig.delimiter as "," | ";" | "\t" | undefined) ?? ",",
          encoding: (uploadConfig.encoding as "utf-8" | "iso-8859-2" | undefined) ?? "utf-8",
          hasHeader: Boolean(uploadConfig.hasHeader ?? true),
          sheetName: (uploadConfig.sheetName as string | undefined) ?? "",
          mappings: (uploadConfig.mapping as Record<string, string> | undefined) ?? {},
        }}
        onSubmit={handleSubmit}
      />
    </PageWrapper>
  );
}
