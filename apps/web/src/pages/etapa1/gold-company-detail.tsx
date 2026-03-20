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
  | "ONBOARDING"
  | "NURTURING_ACTIVE"
  | "AT_RISK"
  | "LOYAL_ADVOCATE"
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
  CONVERTED: ["ONBOARDING", "CHURNED"],
  ONBOARDING: ["NURTURING_ACTIVE"],
  NURTURING_ACTIVE: ["AT_RISK", "LOYAL_ADVOCATE", "DEAD"],
  AT_RISK: ["NURTURING_ACTIVE", "CHURNED", "DEAD"],
  LOYAL_ADVOCATE: ["AT_RISK", "DEAD"],
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

  function handleToggleDnc() {
    if (!id) return;
    patchMutation
      .mutateAsync({ id, payload: { doNotContact: !doNotContact } })
      .then(() => {
        toast.success(doNotContact ? "DoNotContact dezactivat" : "DoNotContact activat");
        detailQuery.refetch().catch(() => undefined);
      })
      .catch(() => undefined);
  }

  function handleTransitionState(toState: GoldState) {
    if (!id) return;
    transitionMutation
      .mutateAsync({ id, payload: { toState } })
      .then(() => {
        toast.success(`Tranzitie aplicata: ${toState}`);
        detailQuery.refetch().catch(() => undefined);
      })
      .catch(() => undefined);
  }

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
        <div className="rounded-lg border border-er/30 bg-er/10 p-4 text-sm text-er">
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
          onClick={handleToggleDnc}
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
            <div className="rounded border border-s700 p-3 text-sm">
              <div className="text-t3">State</div>
              <div className="font-semibold text-t1">{currentState}</div>
            </div>
            <div className="rounded border border-s700 p-3 text-sm">
              <div className="text-t3">Lead score</div>
              <div className="font-semibold text-t1">{Number(item.leadScore ?? 0)}</div>
            </div>
            <div className="rounded border border-s700 p-3 text-sm">
              <div className="text-t3">Assigned</div>
              <div className="font-semibold text-t1">{String(item.assignedTo ?? "unassigned")}</div>
            </div>
            <div className="rounded border border-s700 p-3 text-sm">
              <div className="text-t3">DNC</div>
              <div className="font-semibold text-t1">{doNotContact ? "Yes" : "No"}</div>
            </div>
          </div>

          {allowed.length ? (
            <div className="mb-4 rounded border border-s700 p-3">
              <p className="mb-2 text-sm text-t3">Tranzitii permise</p>
              <div className="flex flex-wrap gap-2">
                {allowed.map((toState) => (
                  <Button
                    key={toState}
                    size="sm"
                    variant="outline"
                    onClick={() => handleTransitionState(toState)}
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
              <pre className="text-xs text-t2">{JSON.stringify(item, null, 2)}</pre>
            </TabsContent>
            <TabsContent value="contact">
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <div className="text-t3">Adresa</div>
                  <div className="font-medium text-t1">{String(item.adresa ?? "-")}</div>
                </div>
                <div>
                  <div className="text-t3">Localitate</div>
                  <div className="font-medium text-t1">{String(item.localitate ?? "-")}</div>
                </div>
                <div>
                  <div className="text-t3">Județ</div>
                  <div className="font-medium text-t1">{String(item.judet ?? "-")}</div>
                </div>
                <div>
                  <div className="text-t3">Cod Poștal</div>
                  <div className="font-medium text-t1">{String(item.codPostal ?? "-")}</div>
                </div>
              </div>
              <p className="mt-4 text-xs text-t3">
                Contactele detaliate (email, telefon) sunt disponibile în tabela gold_contacts.
              </p>
            </TabsContent>
            <TabsContent value="enrichment">
              <pre className="text-xs text-t2">{JSON.stringify(metadata, null, 2)}</pre>
            </TabsContent>
            <TabsContent value="journey">
              {journey.length === 0 ? (
                <p className="py-4 text-sm text-t3">Niciun eveniment în timeline.</p>
              ) : (
                <div className="relative space-y-0 border-l-2 border-s700 pl-4">
                  {journey.map((event) => (
                    <div
                      key={String(
                        event.id ??
                          `${event.createdAt ?? ""}-${event.eventType ?? ""}-${event.toState ?? ""}`,
                      )}
                      className="relative pb-4"
                    >
                      <div className="absolute -left-[1.3rem] top-1 h-2.5 w-2.5 rounded-full bg-b5" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-t1">
                          {String(event.eventType ?? "-")}
                        </span>
                        <span className="text-xs text-t3">
                          {event.createdAt
                            ? new Date(String(event.createdAt)).toLocaleString("ro-RO")
                            : "-"}
                        </span>
                      </div>
                      {Boolean(event.fromState || event.toState) && (
                        <div className="mt-0.5 text-xs text-t2">
                          {String(event.fromState ?? "?")} → {String(event.toState ?? "?")}
                        </div>
                      )}
                      {Boolean(event.channel) && (
                        <div className="mt-0.5 text-xs text-t3">Canal: {String(event.channel)}</div>
                      )}
                      {Boolean(event.subject) && (
                        <div className="mt-0.5 text-xs text-t2">{String(event.subject)}</div>
                      )}
                      {Boolean(event.contentPreview) && (
                        <div className="mt-1 rounded bg-s800 p-2 text-xs text-t3">
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
