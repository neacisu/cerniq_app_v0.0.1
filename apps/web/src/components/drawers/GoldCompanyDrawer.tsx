import { Drawer } from "./Drawer.js";
import { Spinner } from "@/components/ui/spinner.js";
import { Badge } from "@/components/ui/badge.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.js";
import { useGoldCompanyDetail } from "@/hooks/use-etapa1.js";

function FieldRow({ label, value }: Readonly<{ label: string; value: unknown }>) {
  return (
    <div className="flex gap-2 border-b border-s800 py-2">
      <span className="w-44 shrink-0 text-xs font-medium text-t3">{label}</span>
      <span className="text-xs text-t1">
        {value !== null && value !== undefined && value !== "" ? String(value) : "—"}
      </span>
    </div>
  );
}

const GENERAL_FIELDS: { key: string; label: string }[] = [
  { key: "denumire", label: "Denumire" },
  { key: "cui", label: "CUI" },
  { key: "judetCod", label: "Județ" },
  { key: "adresa", label: "Adresa" },
  { key: "cifraAfaceri", label: "Cifra de afaceri" },
  { key: "isAgricultural", label: "Agricol" },
  { key: "assignedTo", label: "Asignat la" },
  { key: "createdAt", label: "Creat la" },
  { key: "updatedAt", label: "Actualizat la" },
];

type Props = Readonly<{ open: boolean; id: string | null; onClose: () => void }>;

export function GoldCompanyDrawer({ open, id, onClose }: Props) {
  const { data: response, isPending, isError, error } = useGoldCompanyDetail(id ?? undefined);
  const item = (response?.data ?? {}) as Record<string, unknown>;
  const metadata = (item.metadata as Record<string, unknown> | undefined) ?? {};
  const journey = (item.journey as Array<Record<string, unknown>> | undefined) ?? [];
  const doNotContact = item.doNotContact === true;

  const title = id ? String(item.denumire ?? "Companie Gold") : "Companie Gold";
  const subtitle = item.cui ? `CUI: ${String(item.cui)}` : undefined;

  return (
    <Drawer open={open} onClose={onClose} title={title} subtitle={subtitle}>
      {isPending && (
        <div className="flex items-center justify-center py-16">
          <Spinner size={28} />
        </div>
      )}
      {isError && (
        <div className="rounded-lg border border-er/30 bg-er/10 p-4 text-sm text-er">
          Eroare la incarcarea companiei: {error?.message ?? "Eroare necunoscuta"}
        </div>
      )}
      {!isPending && !isError && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded border border-s700 p-3 text-sm">
              <div className="text-xs text-t3">State</div>
              <Badge variant="gold">{String(item.currentState ?? "—")}</Badge>
            </div>
            <div className="rounded border border-s700 p-3 text-sm">
              <div className="text-xs text-t3">Lead Score</div>
              <div className="text-sm font-semibold text-t1">{String(item.leadScore ?? "—")}</div>
            </div>
            <div className="rounded border border-s700 p-3 text-sm">
              <div className="text-xs text-t3">Asignat</div>
              <div className="text-sm font-semibold text-t1">
                {String(item.assignedTo ?? "neasignat")}
              </div>
            </div>
            <div className="rounded border border-s700 p-3 text-sm">
              <div className="text-xs text-t3">Do Not Contact</div>
              <div className="text-sm font-semibold text-t1">{doNotContact ? "Da" : "Nu"}</div>
            </div>
          </div>

          <Tabs defaultValue="general">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="enrichment">Enrichment</TabsTrigger>
              <TabsTrigger value="journey">Journey</TabsTrigger>
              <TabsTrigger value="raw">Raw JSON</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <div className="mt-2">
                {GENERAL_FIELDS.map(({ key, label }) => (
                  <FieldRow key={key} label={label} value={item[key]} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="contact">
              <div className="mt-2">
                {[
                  { key: "email", label: "Email" },
                  { key: "phone", label: "Telefon" },
                  { key: "website", label: "Website" },
                  { key: "adresa", label: "Adresa" },
                ].map(({ key, label }) => (
                  <FieldRow key={key} label={label} value={item[key]} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="enrichment">
              <pre className="mt-2 max-h-[60vh] overflow-auto rounded-lg border border-s700 bg-s950 p-4 text-xs text-t2">
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </TabsContent>

            <TabsContent value="journey">
              <div className="mt-2 space-y-2">
                {journey.length === 0 ? (
                  <p className="py-4 text-sm text-t3">Niciun eveniment în timeline.</p>
                ) : (
                  journey.map((event) => (
                    <div
                      key={String(
                        event.id ??
                          `${event.createdAt ?? ""}-${event.fromState ?? ""}-${event.toState ?? ""}`,
                      )}
                      className="rounded border border-s700 p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-t1">
                          {String(event.fromState ?? "?")} → {String(event.toState ?? "?")}
                        </span>
                        <span className="text-xs text-t3">
                          {event.createdAt
                            ? new Date(String(event.createdAt)).toLocaleString("ro-RO")
                            : "-"}
                        </span>
                      </div>
                      {Boolean(event.triggeredBy) && (
                        <div className="mt-0.5 text-xs text-t3">
                          Declanșat de: {String(event.triggeredBy)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="raw">
              <pre className="mt-2 max-h-[60vh] overflow-auto rounded-lg border border-s700 bg-s950 p-4 text-xs text-t2">
                {JSON.stringify(item, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>
        </>
      )}
    </Drawer>
  );
}
