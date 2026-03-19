import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
import { ImportMappingForm } from "@/components/forms/ImportMappingForm.js";
import { toast } from "@/components/ui/toast-api.js";
import { useImportDetail } from "@/hooks/use-etapa1.js";

const targetFields = [
  { label: "companyName", value: "companyName" },
  { label: "cui", value: "cui" },
  { label: "email", value: "email" },
  { label: "phone", value: "phone" },
  { label: "address", value: "address" },
];

export function ImportMapping() {
  const { id } = useParams();
  const detailQuery = useImportDetail(id);
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
    return ["Firm Name", "Vat", "Email", "Phone", "Address"];
  }, [uploadConfig.mapping]);

  if (detailQuery.isPending) {
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
      subtitle={`Import: ${String(item.filename ?? id ?? "-")} · encoding: ${String(uploadConfig.encoding ?? "utf-8")}`}
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
        onSubmit={async () => {
          toast.success("Mapping validat");
        }}
      />
    </PageWrapper>
  );
}
