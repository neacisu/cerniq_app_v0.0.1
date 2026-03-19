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
import { EnrichmentStatusBadge } from "@/components/data/EnrichmentStatusBadge.js";
import { QualityScoreBadge } from "@/components/data/QualityScoreBadge.js";
import {
  useSilverCompanyDetail,
  useSilverEnrichmentLog,
  useTriggerSilverEnrich,
  useTriggerSilverPromote,
} from "@/hooks/use-etapa1.js";
import { toast } from "@/components/ui/toast-api.js";

export function SilverCompanyDetail() {
  const { id } = useParams();
  const detailQuery = useSilverCompanyDetail(id);
  const enrichLogQuery = useSilverEnrichmentLog(id, 100, 0);
  const enrichMutation = useTriggerSilverEnrich();
  const promoteMutation = useTriggerSilverPromote();
  const item = detailQuery.data?.data ?? {};
  const metadata = (item.metadata as Record<string, unknown> | undefined) ?? {};
  const enrichmentLogs =
    (item.enrichmentLogs as Array<Record<string, unknown>> | undefined) ??
    enrichLogQuery.data?.data ??
    [];
  const totalQuality = Number(item.totalQualityScore ?? 0);

  if (detailQuery.isPending) {
    return (
      <PageWrapper title="Silver Company Detail">
        <div className="flex items-center justify-center py-12">
          <Spinner size={32} />
        </div>
      </PageWrapper>
    );
  }

  if (detailQuery.isError) {
    return (
      <PageWrapper title="Silver Company Detail">
        <div className="rounded-lg border border-er/30 bg-er/10 p-4 text-sm text-er">
          Eroare la încărcarea datelor: {detailQuery.error?.message ?? "Eroare necunoscută"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Silver Company Detail"
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (!id) return;
              enrichMutation.mutateAsync(id).then(() => {
                toast.success("Enrichment declansat");
                detailQuery.refetch();
              });
            }}
            disabled={enrichMutation.isPending}
          >
            {enrichMutation.isPending ? "Se ruleaza..." : "Re-Enrich"}
          </Button>
          <Button
            onClick={() => {
              if (!id) return;
              promoteMutation.mutateAsync(id).then(() => {
                toast.success("Promovare in Gold declansata");
              });
            }}
            disabled={promoteMutation.isPending}
          >
            {promoteMutation.isPending ? "Se trimite..." : "Promote to Gold"}
          </Button>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>{String(item.denumire ?? id ?? "-")}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <div className="rounded border border-s700 p-3 text-sm">
              <div className="text-t3">CUI</div>
              <div className="font-semibold text-t1">{String(item.cui ?? "-")}</div>
            </div>
            <div className="rounded border border-s700 p-3 text-sm">
              <div className="text-t3">Enrichment</div>
              <div className="font-semibold text-t1">
                <EnrichmentStatusBadge status={String(item.enrichmentStatus ?? "pending")} />
              </div>
            </div>
            <div className="rounded border border-s700 p-3 text-sm">
              <div className="text-t3">Quality</div>
              <div className="font-semibold text-t1">
                <QualityScoreBadge value={Number.isFinite(totalQuality) ? totalQuality : 0} />
              </div>
            </div>
            <div className="rounded border border-s700 p-3 text-sm">
              <div className="text-t3">Promotion</div>
              <div className="font-semibold text-t1">{String(item.promotionStatus ?? "-")}</div>
            </div>
          </div>

          <Tabs defaultValue="general">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="enrichment">Enrichment</TabsTrigger>
              <TabsTrigger value="enrichment-logs">Enrichment Logs</TabsTrigger>
            </TabsList>
            <TabsContent value="general">
              <pre className="text-xs text-t2">{JSON.stringify(item, null, 2)}</pre>
            </TabsContent>
            <TabsContent value="financial">
              <pre className="text-xs text-t2">
                {JSON.stringify(
                  {
                    cifraAfaceri: metadata.cifraAfaceri,
                    profitNet: metadata.profitNet,
                    angajati: metadata.angajati,
                  },
                  null,
                  2,
                )}
              </pre>
            </TabsContent>
            <TabsContent value="contact">
              <pre className="text-xs text-t2">
                {JSON.stringify(
                  {
                    email: item.email,
                    phone: item.phone,
                    website: item.website,
                    address: item.adresa,
                  },
                  null,
                  2,
                )}
              </pre>
            </TabsContent>
            <TabsContent value="enrichment">
              <pre className="text-xs text-t2">{JSON.stringify(metadata, null, 2)}</pre>
            </TabsContent>
            <TabsContent value="enrichment-logs">
              {enrichmentLogs.length === 0 ? (
                <p className="py-4 text-sm text-t3">Niciun log de enrichment disponibil.</p>
              ) : (
                <div className="space-y-2">
                  {enrichmentLogs.map((log) => (
                    <div
                      key={String(
                        log.id ??
                          `${log.createdAt ?? ""}-${log.source ?? ""}-${log.operation ?? ""}`,
                      )}
                      className="rounded border border-s700 p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-t1">
                          {String(log.source ?? "-")} &middot; {String(log.operation ?? "-")}
                        </span>
                        <span className="text-xs text-t3">
                          {log.createdAt
                            ? new Date(String(log.createdAt)).toLocaleString("ro-RO")
                            : "-"}
                        </span>
                      </div>
                      {Boolean(log.fieldsUpdated) && (
                        <div className="mt-1 text-xs text-t2">
                          Câmpuri:{" "}
                          {Array.isArray(log.fieldsUpdated)
                            ? (log.fieldsUpdated as string[]).join(", ")
                            : String(log.fieldsUpdated)}
                        </div>
                      )}
                      {log.durationMs != null && (
                        <div className="mt-0.5 text-xs text-t3">
                          Durată: {Number(log.durationMs)}ms
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
