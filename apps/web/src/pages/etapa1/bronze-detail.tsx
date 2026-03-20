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

/**
 * Type-safe extractor for processingStatus from bronze contact item.
 * Returns the status string if it's a valid string value, otherwise returns "—".
 */
function extractProcessingStatus(item: Record<string, unknown> | undefined): string {
  if (item == null) return "—";
  const value = item.processingStatus;
  return typeof value === "string" ? value : "—";
}

/**
 * Enterprise-grade value formatter for display in FieldGrid.
 * Handles all possible types safely without risking [object Object] stringification.
 *
 * @param value - The value to format (can be any type from Record<string, unknown>)
 * @returns A safe string representation for display, or "—" for null/undefined
 */
function formatFieldValue(value: unknown): string {
  // Handle null and undefined
  if (value == null) return "—";

  // Handle primitives (string, number, boolean)
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  // Handle Date objects
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    // For arrays of primitives, join them; otherwise stringify
    const hasOnlyPrimitives = value.every(
      (item) =>
        item == null ||
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean",
    );
    if (hasOnlyPrimitives) {
      return value.map((item) => (item == null ? "null" : String(item))).join(", ");
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "[Array]";
    }
  }

  // Handle objects (including plain objects, but not Date which is already handled)
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "[Object]";
    }
  }

  // Fallback for any other type (shouldn't happen, but defensive)
  // Only use String() for primitives that weren't caught above (e.g., symbol, bigint)
  if (typeof value === "symbol") {
    return value.toString();
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  // Ultimate fallback - but this should never be reached
  return "[Unknown Type]";
}

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
            <p className="text-sm text-t1">{formatFieldValue(val)}</p>
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
        <div className="rounded-lg border border-er bg-er/10 p-4 text-sm text-er">
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
        <Link to="/bronze" className="text-sm text-b5 hover:underline">
          &larr; Inapoi la Bronze
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="info">{extractProcessingStatus(item)}</Badge>
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
