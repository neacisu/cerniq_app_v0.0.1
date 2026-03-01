import { useParams } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
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
import { useCancelImport, useImportDetail } from "@/hooks/use-etapa1.js";
import { toast } from "@/components/ui/toast-api.js";

export function ImportDetail() {
  const { id } = useParams();
  const detailQuery = useImportDetail(id);
  const cancelMutation = useCancelImport();
  const item = detailQuery.data?.data ?? {};
  const metadata = (item.metadata as Record<string, unknown> | undefined) ?? {};
  const uploadConfig = (metadata.uploadConfig as Record<string, unknown> | undefined) ?? {};
  const status = String(item.status ?? "unknown");
  const canCancel = status === "pending" || status === "processing";
  const progress =
    Number(item.totalRows ?? 0) > 0
      ? Math.round((Number(item.processedRows ?? 0) / Number(item.totalRows ?? 0)) * 100)
      : 0;

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
        <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-4 text-sm text-[var(--color-danger)]">
          Eroare la încărcarea datelor: {detailQuery.error?.message ?? "Eroare necunoscută"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Import Detail"
      actions={
        canCancel ? (
          <Button
            variant="danger"
            onClick={() => {
              if (!id) return;
              void cancelMutation.mutateAsync(id).then(() => {
                toast.success("Import anulat");
                void detailQuery.refetch();
              });
            }}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? "Se anuleaza..." : "Anuleaza Import"}
          </Button>
        ) : null
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>{String(item.filename ?? id ?? "-")}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <div className="rounded border border-[var(--color-s700)] p-3 text-sm">
              <div className="text-[var(--color-t3)]">Status</div>
              <div className="font-semibold text-[var(--color-t1)]">{status}</div>
            </div>
            <div className="rounded border border-[var(--color-s700)] p-3 text-sm">
              <div className="text-[var(--color-t3)]">Randuri</div>
              <div className="font-semibold text-[var(--color-t1)]">
                {Number(item.processedRows ?? 0)} / {Number(item.totalRows ?? 0)}
              </div>
            </div>
            <div className="rounded border border-[var(--color-s700)] p-3 text-sm">
              <div className="text-[var(--color-t3)]">Progres</div>
              <div className="font-semibold text-[var(--color-t1)]">{progress}%</div>
            </div>
          </div>

          <Tabs defaultValue="config">
            <TabsList>
              <TabsTrigger value="config">Config</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="raw">Raw</TabsTrigger>
            </TabsList>
            <TabsContent value="config">
              <pre className="text-xs text-[var(--color-t2)]">
                {JSON.stringify(uploadConfig, null, 2)}
              </pre>
            </TabsContent>
            <TabsContent value="metadata">
              <pre className="text-xs text-[var(--color-t2)]">
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </TabsContent>
            <TabsContent value="raw">
              <pre className="text-xs text-[var(--color-t2)]">{JSON.stringify(item, null, 2)}</pre>
            </TabsContent>
          </Tabs>
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
