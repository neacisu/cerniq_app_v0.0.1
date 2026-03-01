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
import {
  useGoldCompanyDetail,
  useGoldCompanyJourney,
  usePatchGoldCompany,
  useTransitionGoldCompany,
} from "@/hooks/use-etapa1.js";
import { toast } from "@/components/ui/toast-api.js";

type GoldState =
  | "COLD"
  | "CONTACTED_WA"
  | "CONTACTED_EMAIL"
  | "CONTACTED_PHONE"
  | "WARM_REPLY"
  | "ENGAGED"
  | "NEGOTIATION"
  | "PROPOSAL"
  | "CLOSING"
  | "CONVERTED"
  | "CHURNED"
  | "DEAD"
  | "DO_NOT_CONTACT";

const transitions: Record<GoldState, GoldState[]> = {
  COLD: ["CONTACTED_WA", "CONTACTED_EMAIL", "CONTACTED_PHONE", "DO_NOT_CONTACT", "DEAD"],
  CONTACTED_WA: ["WARM_REPLY", "ENGAGED", "DEAD"],
  CONTACTED_EMAIL: ["WARM_REPLY", "ENGAGED", "DEAD"],
  CONTACTED_PHONE: ["WARM_REPLY", "ENGAGED", "DEAD"],
  WARM_REPLY: ["ENGAGED", "NEGOTIATION", "DEAD"],
  ENGAGED: ["NEGOTIATION", "PROPOSAL", "DEAD"],
  NEGOTIATION: ["PROPOSAL", "CLOSING", "CHURNED", "DEAD"],
  PROPOSAL: ["CLOSING", "CONVERTED", "CHURNED", "DEAD"],
  CLOSING: ["CONVERTED", "CHURNED", "DEAD"],
  CONVERTED: ["CHURNED"],
  CHURNED: [],
  DEAD: [],
  DO_NOT_CONTACT: [],
};

export function GoldCompanyDetail() {
  const { id } = useParams();
  const detailQuery = useGoldCompanyDetail(id);
  const journeyQuery = useGoldCompanyJourney(id);
  const transitionMutation = useTransitionGoldCompany();
  const patchMutation = usePatchGoldCompany();
  const item = detailQuery.data?.data ?? {};
  const metadata = (item.metadata as Record<string, unknown> | undefined) ?? {};
  const journey =
    (item.journey as Array<Record<string, unknown>> | undefined) ?? journeyQuery.data?.data ?? [];
  const currentStateRaw = String(item.currentState ?? "COLD");
  const currentState = (currentStateRaw in transitions ? currentStateRaw : "COLD") as GoldState;
  const allowed = transitions[currentState];
  const doNotContact = item.doNotContact === true;

  if (detailQuery.isPending) {
    return (
      <PageWrapper title="Gold Company Detail">
        <div className="flex items-center justify-center py-12">
          <Spinner size={32} />
        </div>
      </PageWrapper>
    );
  }

  if (detailQuery.isError) {
    return (
      <PageWrapper title="Gold Company Detail">
        <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-4 text-sm text-[var(--color-danger)]">
          Eroare la încărcarea datelor: {detailQuery.error?.message ?? "Eroare necunoscută"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Gold Company Detail"
      actions={
        <Button
          variant={doNotContact ? "outline" : "danger"}
          onClick={() => {
            if (!id) return;
            void patchMutation
              .mutateAsync({
                id,
                payload: { doNotContact: !doNotContact },
              })
              .then(() => {
                toast.success(doNotContact ? "DoNotContact dezactivat" : "DoNotContact activat");
                void detailQuery.refetch();
              });
          }}
          disabled={patchMutation.isPending}
        >
          {doNotContact ? "Permite Contact" : "Do Not Contact"}
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>{String(item.denumire ?? id ?? "-")}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <div className="rounded border border-[var(--color-s700)] p-3 text-sm">
              <div className="text-[var(--color-t3)]">State</div>
              <div className="font-semibold text-[var(--color-t1)]">{currentState}</div>
            </div>
            <div className="rounded border border-[var(--color-s700)] p-3 text-sm">
              <div className="text-[var(--color-t3)]">Lead score</div>
              <div className="font-semibold text-[var(--color-t1)]">
                {Number(item.leadScore ?? 0)}
              </div>
            </div>
            <div className="rounded border border-[var(--color-s700)] p-3 text-sm">
              <div className="text-[var(--color-t3)]">Assigned</div>
              <div className="font-semibold text-[var(--color-t1)]">
                {String(item.assignedTo ?? "unassigned")}
              </div>
            </div>
            <div className="rounded border border-[var(--color-s700)] p-3 text-sm">
              <div className="text-[var(--color-t3)]">DNC</div>
              <div className="font-semibold text-[var(--color-t1)]">
                {doNotContact ? "Yes" : "No"}
              </div>
            </div>
          </div>

          {allowed.length ? (
            <div className="mb-4 rounded border border-[var(--color-s700)] p-3">
              <p className="mb-2 text-sm text-[var(--color-t3)]">Tranzitii permise</p>
              <div className="flex flex-wrap gap-2">
                {allowed.map((toState) => (
                  <Button
                    key={toState}
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!id) return;
                      void transitionMutation.mutateAsync({ id, payload: { toState } }).then(() => {
                        toast.success(`Tranzitie aplicata: ${toState}`);
                        void detailQuery.refetch();
                      });
                    }}
                    disabled={transitionMutation.isPending}
                  >
                    {toState}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <Tabs defaultValue="general">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="enrichment">Enrichment</TabsTrigger>
              <TabsTrigger value="journey">Journey</TabsTrigger>
            </TabsList>
            <TabsContent value="general">
              <pre className="text-xs text-[var(--color-t2)]">{JSON.stringify(item, null, 2)}</pre>
            </TabsContent>
            <TabsContent value="contact">
              <pre className="text-xs text-[var(--color-t2)]">
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
              <pre className="text-xs text-[var(--color-t2)]">
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </TabsContent>
            <TabsContent value="journey">
              {journey.length === 0 ? (
                <p className="py-4 text-sm text-[var(--color-t3)]">Niciun eveniment în timeline.</p>
              ) : (
                <div className="relative space-y-0 border-l-2 border-[var(--color-s700)] pl-4">
                  {journey.map((event, idx) => (
                    <div key={String(event.id ?? idx)} className="relative pb-4">
                      <div className="absolute -left-[1.3rem] top-1 h-2.5 w-2.5 rounded-full bg-[var(--color-brand)]" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[var(--color-t1)]">
                          {String(event.eventType ?? "-")}
                        </span>
                        <span className="text-xs text-[var(--color-t3)]">
                          {event.createdAt
                            ? new Date(String(event.createdAt)).toLocaleString("ro-RO")
                            : "-"}
                        </span>
                      </div>
                      {Boolean(event.fromState || event.toState) && (
                        <div className="mt-0.5 text-xs text-[var(--color-t2)]">
                          {String(event.fromState ?? "?")} → {String(event.toState ?? "?")}
                        </div>
                      )}
                      {Boolean(event.channel) && (
                        <div className="mt-0.5 text-xs text-[var(--color-t3)]">
                          Canal: {String(event.channel)}
                        </div>
                      )}
                      {Boolean(event.subject) && (
                        <div className="mt-0.5 text-xs text-[var(--color-t2)]">
                          {String(event.subject)}
                        </div>
                      )}
                      {Boolean(event.contentPreview) && (
                        <div className="mt-1 rounded bg-[var(--color-s800)] p-2 text-xs text-[var(--color-t3)]">
                          {String(event.contentPreview)}
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
