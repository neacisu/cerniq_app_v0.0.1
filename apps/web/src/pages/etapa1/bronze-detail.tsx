import { Link, useParams } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { Badge } from "@/components/ui/badge.js";
import { Spinner } from "@/components/ui/spinner.js";
import { EmptyState } from "@/components/feedback/EmptyState.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.js";
import { useBronzeContactDetail, useReprocessBronze } from "@/hooks/use-etapa1.js";
import { toast } from "@/components/ui/toast-api.js";

const GENERAL_FIELDS: { key: string; label: string }[] = [
  { key: "extractedName", label: "Nume" },
  { key: "extractedCui", label: "CUI" },
  { key: "sourceType", label: "Sursa" },
  { key: "processingStatus", label: "Status procesare" },
  { key: "createdAt", label: "Creat la" },
];

const META_FIELDS: { key: string; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "importBatchId", label: "Batch ID" },
  { key: "updatedAt", label: "Actualizat la" },
  { key: "rawRowIndex", label: "Index rand" },
  { key: "validationErrors", label: "Erori validare" },
];

function FieldGrid({
  fields,
  data,
}: Readonly<{
  fields: ReadonlyArray<{ key: string; label: string }>;
  data: Record<string, unknown>;
}>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map(({ key, label }) => {
        const val = data[key];
        return (
          <div key={key} className="space-y-1">
            <span className="text-xs font-medium text-t3">{label}</span>
            <p className="text-sm text-t1">
              {val !== null && val !== undefined ? String(val) : "—"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function BronzeDetail() {
  const { id } = useParams();
  const { data: response, isPending, isError, error } = useBronzeContactDetail(id);
  const reprocess = useReprocessBronze();
  const item = (response?.data ?? {}) as Record<string, unknown>;

  const handleReprocess = () => {
    if (!id) return;
    reprocess.mutate(id, {
      onSuccess: () => toast.success("Contact trimis la reprocesare"),
      onError: () => toast.error("Eroare la reprocesare"),
    });
  };

  if (isPending) {
    return (
      <PageWrapper title="Bronze Contact Detail">
        <div className="flex items-center justify-center py-20">
          <Spinner size={32} />
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Bronze Contact Detail">
        <div className="rounded-lg border border-(--color-danger) bg-(--color-danger)/10 p-4 text-sm text-(--color-danger)">
          Eroare la incarcarea contactului: {error?.message ?? "Eroare necunoscuta"}
        </div>
      </PageWrapper>
    );
  }

  if (!item.id) {
    return (
      <PageWrapper title="Bronze Contact Detail">
        <EmptyState
          icon="User"
          title="Contact negasit"
          description="Contactul bronze solicitat nu exista."
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Bronze Contact Detail">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/etapa1/bronze" className="text-sm text-b5 hover:underline">
          &larr; Inapoi la Bronze
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="info">{String(item.processingStatus ?? "—")}</Badge>
          <Button size="sm" onClick={handleReprocess} disabled={reprocess.isPending}>
            {reprocess.isPending ? "Se proceseaza..." : "Reproceseaza"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{String(item.extractedName ?? id ?? "—")}</CardTitle>
        </CardHeader>
        <CardBody>
          <Tabs defaultValue="general">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="raw">Raw JSON</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <FieldGrid fields={GENERAL_FIELDS} data={item} />
            </TabsContent>

            <TabsContent value="metadata">
              <FieldGrid fields={META_FIELDS} data={item} />
            </TabsContent>

            <TabsContent value="raw">
              <pre className="max-h-96 overflow-auto rounded-lg border border-s700 bg-s950 p-4 text-xs text-t2">
                {JSON.stringify(item, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
