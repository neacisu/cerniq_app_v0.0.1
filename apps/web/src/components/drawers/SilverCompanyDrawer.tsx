import { Drawer } from "./Drawer.js";
import { Spinner } from "@/components/ui/spinner.js";
import { Badge } from "@/components/ui/badge.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.js";
import { EnrichmentStatusBadge } from "@/components/data/EnrichmentStatusBadge.js";
import { QualityScoreBadge } from "@/components/data/QualityScoreBadge.js";
import { useSilverCompanyDetail } from "@/hooks/use-etapa1.js";

function FieldRow({ label, value }: Readonly<{ label: string; value: unknown }>) {
  let display: string;
  if (value === null || value === undefined || value === "") {
    display = "—";
  } else if (typeof value === "boolean") {
    display = value ? "Da" : "Nu";
  } else {
    display = String(value);
  }
  return (
    <div className="flex gap-2 border-b border-s800 py-2">
      <span className="w-44 shrink-0 text-xs font-medium text-t3">{label}</span>
      <span className="text-xs text-t1 break-all">{display}</span>
    </div>
  );
}

function SectionTitle({ children }: Readonly<{ children: string }>) {
  return (
    <p className="mt-4 mb-1 text-xs font-semibold text-t3 uppercase tracking-wide">{children}</p>
  );
}

const GENERAL_FIELDS: { key: string; label: string }[] = [
  { key: "denumire", label: "Denumire" },
  { key: "cui", label: "CUI" },
  { key: "nrRegCom", label: "Nr. Reg. Com." },
  { key: "nrRegComOriginal", label: "Nr. Reg. Com. (original)" },
  { key: "formaJuridica", label: "Forma juridică" },
  { key: "statusFirma", label: "Status firmă" },
  { key: "dataInregistrare", label: "Data înregistrare" },
  { key: "judet", label: "Județ" },
  { key: "localitate", label: "Localitate" },
  { key: "adresa", label: "Adresă" },
  { key: "codPostal", label: "Cod poștal" },
  { key: "codCaenPrincipal", label: "CAEN" },
  { key: "denumireCaen", label: "Denumire CAEN" },
  { key: "telefon", label: "Telefon" },
  { key: "email", label: "Email" },
  { key: "website", label: "Website" },
  { key: "platitorTva", label: "Plătitor TVA" },
  { key: "tvaLaIncasare", label: "TVA la încasare" },
  { key: "inregistratEfactura", label: "Înregistrat e-Factură" },
  { key: "createdAt", label: "Creat la" },
  { key: "updatedAt", label: "Actualizat la" },
];

const FINANCIAL_FIELDS: { key: string; label: string }[] = [
  { key: "cifraAfaceri", label: "Cifra de afaceri" },
  { key: "profitNet", label: "Profit / Pierdere net" },
  { key: "profitBrut", label: "Profit / Pierdere brut" },
  { key: "venituriTotale", label: "Venituri totale" },
  { key: "cheltuieliTotale", label: "Cheltuieli totale" },
  { key: "activeTotale", label: "Total active" },
  { key: "activeImobilizate", label: "Active imobilizate" },
  { key: "activeCirculante", label: "Active circulante" },
  { key: "creante", label: "Creanțe" },
  { key: "stocuri", label: "Stocuri" },
  { key: "cheltuieliInAvans", label: "Cheltuieli în avans" },
  { key: "casaSiConturiBanci", label: "Casa și conturi la bănci" },
  { key: "capitaluriProprii", label: "Capitaluri proprii" },
  { key: "capitalSocial", label: "Capital social" },
  { key: "datoriiTotale", label: "Datorii totale" },
  { key: "provizioane", label: "Provizioane" },
  { key: "venituriInAvans", label: "Venituri în avans" },
  { key: "numarAngajati", label: "Nr. angajați" },
  { key: "anulInfiintarii", label: "Anul înființării" },
  { key: "anBilant", label: "An bilanț" },
  { key: "ratingExtern", label: "Rating extern" },
  { key: "limitaCreditEur", label: "Limită credit (EUR)" },
  { key: "scorRiscTermene", label: "Scor risc Termene" },
  { key: "categorieRisc", label: "Categorie risc" },
];

const ANAF_SUMMARY_FIELDS: { key: string; label: string }[] = [
  { key: "datoriiAnaf", label: "Datorii ANAF total" },
  { key: "datoriiAnafData", label: "Data verificare ANAF" },
  { key: "obligatiiBugetStat", label: "Obligații buget stat" },
  { key: "obligatiiBugetSomaj", label: "Obligații buget șomaj" },
  { key: "obligatiiBugetAsigSociale", label: "Obligații asig. sociale" },
  { key: "obligatiiBugetSanatate", label: "Obligații sănătate" },
];

type Props = Readonly<{ open: boolean; id: string | null; onClose: () => void }>;

type DatorieAnaf = Record<string, unknown>;
type BpiAct = Record<string, unknown>;
type CipIncident = Record<string, unknown>;
type Dosar = Record<string, unknown> & {
  parti?: Record<string, unknown>[];
  termene?: Record<string, unknown>[];
};
type Contact = Record<string, unknown>;

export function SilverCompanyDrawer({ open, id, onClose }: Props) {
  const { data: response, isPending, isError, error } = useSilverCompanyDetail(id ?? undefined);
  const item = (response?.data ?? {}) as Record<string, unknown>;
  const metadata = (item.metadata as Record<string, unknown> | undefined) ?? {};
  const enrichmentLogs = (item.enrichmentLogs as Array<Record<string, unknown>> | undefined) ?? [];
  const datoriiAnaf = (item.datoriiAnaf as DatorieAnaf[] | undefined) ?? [];
  const bpiActe = (item.bpiActe as BpiAct[] | undefined) ?? [];
  const cipIncidente = (item.cipIncidente as CipIncident[] | undefined) ?? [];
  const dosare = (item.dosare as Dosar[] | undefined) ?? [];
  const contacts = (item.contacts as Contact[] | undefined) ?? [];
  const totalQuality = Number(item.totalQualityScore ?? 0);

  const title = id ? String(item.denumire ?? "Companie Silver") : "Companie Silver";
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
              <div className="text-xs text-t3">Enrichment</div>
              <EnrichmentStatusBadge status={String(item.enrichmentStatus ?? "pending")} />
            </div>
            <div className="rounded border border-s700 p-3 text-sm">
              <div className="text-xs text-t3">Quality</div>
              <QualityScoreBadge value={Number.isFinite(totalQuality) ? totalQuality : 0} />
            </div>
            <div className="rounded border border-s700 p-3 text-sm">
              <div className="text-xs text-t3">Promotion</div>
              <div className="text-sm font-semibold text-t1">
                {String(item.promotionStatus ?? "—")}
              </div>
            </div>
            <div className="rounded border border-s700 p-3 text-sm">
              <div className="text-xs text-t3">Nr. Reg. Com.</div>
              <div className="text-sm font-semibold text-t1">
                {String(item.nrRegCom ?? item.nrRegComOriginal ?? "—")}
              </div>
            </div>
          </div>

          <Tabs defaultValue="general">
            <TabsList className="flex-wrap">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="financial">Financiar</TabsTrigger>
              <TabsTrigger value="contacts">Contacte</TabsTrigger>
              <TabsTrigger value="datorii">
                Datorii ANAF
                {datoriiAnaf.length > 0 && (
                  <Badge variant="warning" className="ml-1 text-[10px] px-1 py-0">
                    {datoriiAnaf.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="bpi">
                BPI
                {bpiActe.length > 0 && (
                  <Badge variant="error" className="ml-1 text-[10px] px-1 py-0">
                    {bpiActe.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="cip">
                CIP
                {cipIncidente.length > 0 && (
                  <Badge variant="error" className="ml-1 text-[10px] px-1 py-0">
                    {cipIncidente.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="dosare">
                Dosare
                {dosare.length > 0 && (
                  <Badge variant="info" className="ml-1 text-[10px] px-1 py-0">
                    {dosare.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="enrichment">Enrichment</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="raw">Raw JSON</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <div className="mt-2">
                {GENERAL_FIELDS.map(({ key, label }) => (
                  <FieldRow key={key} label={label} value={item[key]} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="financial">
              <div className="mt-2">
                {FINANCIAL_FIELDS.map(({ key, label }) => (
                  <FieldRow key={key} label={label} value={item[key]} />
                ))}
                <SectionTitle>Datorii ANAF (sumar)</SectionTitle>
                {ANAF_SUMMARY_FIELDS.map(({ key, label }) => (
                  <FieldRow key={key} label={label} value={item[key]} />
                ))}
                <SectionTitle>BPI &amp; CIP (sumar)</SectionTitle>
                <FieldRow label="BPI – nr. acte" value={item.bpiNumarActe} />
                <FieldRow label="BPI – în insolvență" value={item.bpiInInsolventa} />
                <FieldRow label="BPI – data ult. modificare" value={item.bpiDataUltimaModificare} />
                <FieldRow label="CIP – total incidente" value={item.cipTotalIncidente} />
                <FieldRow label="CIP – incidente majore" value={item.cipIncidenteMajore} />
                <FieldRow label="CIP – sumă refuzată" value={item.cipSumaRefuzata} />
                <FieldRow label="CIP – data ult. incident" value={item.cipDataUltimulIncident} />
                <FieldRow label="Nr. dosare actuale" value={item.numarDosareActuale} />
              </div>
            </TabsContent>

            <TabsContent value="contacts">
              <div className="mt-2">
                {contacts.length === 0 ? (
                  <p className="py-4 text-sm text-t3">Niciun contact disponibil.</p>
                ) : (
                  contacts.map((c) => (
                    <div
                      key={String(
                        c.id ??
                          `${c.email ?? ""}-${c.telefon ?? ""}-${c.prenume ?? ""}-${c.nume ?? ""}`,
                      )}
                      className="mb-3 rounded border border-s700 p-3"
                    >
                      {Boolean(c.isPrimary) && (
                        <Badge variant="brand" className="mb-2 text-xs">
                          Primary
                        </Badge>
                      )}
                      <FieldRow label="Prenume" value={c.prenume} />
                      <FieldRow label="Nume" value={c.nume} />
                      <FieldRow label="Email" value={c.email} />
                      <FieldRow label="Telefon" value={c.telefon} />
                      <FieldRow label="Funcție" value={c.functie} />
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="datorii">
              <div className="mt-2">
                {datoriiAnaf.length === 0 ? (
                  <p className="py-4 text-sm text-t3">Nicio datorie ANAF înregistrată.</p>
                ) : (
                  datoriiAnaf.map((d) => (
                    <div
                      key={String(
                        d.id ??
                          `${d.tipBuget ?? ""}-${d.dataVerificare ?? ""}-${d.sumaRestanta ?? ""}`,
                      )}
                      className="mb-3 rounded border border-s700 p-3"
                    >
                      <FieldRow label="Tip buget" value={d.tipBuget} />
                      <FieldRow label="Sumă restantă" value={d.sumaRestanta} />
                      <FieldRow label="Data verificare" value={d.dataVerificare} />
                      <FieldRow label="Sursă" value={d.sursa} />
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="bpi">
              <div className="mt-2">
                {bpiActe.length === 0 ? (
                  <p className="py-4 text-sm text-t3">Niciun act BPI înregistrat.</p>
                ) : (
                  bpiActe.map((b) => (
                    <div
                      key={String(
                        b.id ?? `${b.numarAct ?? ""}-${b.dataAct ?? ""}-${b.numarDosar ?? ""}`,
                      )}
                      className="mb-3 rounded border border-s700 p-3"
                    >
                      <FieldRow label="Tip act" value={b.tipAct} />
                      <FieldRow label="Număr act" value={b.numarAct} />
                      <FieldRow label="Data act" value={b.dataAct} />
                      <FieldRow label="Nr. dosar" value={b.numarDosar} />
                      <FieldRow label="Instanță" value={b.instanta} />
                      <FieldRow label="Stare" value={b.stare} />
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="cip">
              <div className="mt-2">
                {cipIncidente.length === 0 ? (
                  <p className="py-4 text-sm text-t3">Niciun incident CIP înregistrat.</p>
                ) : (
                  cipIncidente.map((c) => (
                    <div
                      key={String(
                        c.id ??
                          `${c.serieNumar ?? ""}-${c.dataRefuz ?? ""}-${c.sumaRefuzata ?? ""}`,
                      )}
                      className="mb-3 rounded border border-s700 p-3"
                    >
                      {c.esteMajor === true && (
                        <Badge variant="error" className="mb-2 text-xs">
                          Incident Major
                        </Badge>
                      )}
                      <FieldRow label="Tip instrument" value={c.tipInstrument} />
                      <FieldRow label="Serie/Număr" value={c.serieNumar} />
                      <FieldRow label="Sumă refuzată" value={c.sumaRefuzata} />
                      <FieldRow label="Data refuz" value={c.dataRefuz} />
                      <FieldRow label="Motiv refuz" value={c.motivRefuz} />
                      <FieldRow label="Instituție financiară" value={c.institutieFinanciara} />
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="dosare">
              <div className="mt-2">
                {dosare.length === 0 ? (
                  <p className="py-4 text-sm text-t3">Niciun dosar înregistrat.</p>
                ) : (
                  dosare.map((d) => (
                    <div
                      key={String(
                        d.id ??
                          `${d.numarDosar ?? ""}-${d.instanta ?? ""}-${d.dataUltimaModificare ?? ""}`,
                      )}
                      className="mb-4 rounded border border-s700 p-3"
                    >
                      <FieldRow label="Nr. dosar" value={d.numarDosar} />
                      <FieldRow label="Instanță" value={d.instanta} />
                      <FieldRow label="Categorie" value={d.categorieDosar} />
                      <FieldRow label="Obiect cauză" value={d.obiectDosar} />
                      <FieldRow label="Stadiu" value={d.stadiu} />
                      <FieldRow label="Ultima modificare" value={d.dataUltimaModificare} />
                      {Array.isArray(d.parti) && d.parti.length > 0 && (
                        <>
                          <SectionTitle>Părți dosar</SectionTitle>
                          {d.parti.map((p) => (
                            <div
                              key={String(p.id ?? `${p.calitate ?? ""}-${p.numeParte ?? ""}`)}
                              className="ml-2 mb-1"
                            >
                              <FieldRow label={String(p.calitate ?? "Parte")} value={p.numeParte} />
                            </div>
                          ))}
                        </>
                      )}
                      {Array.isArray(d.termene) && d.termene.length > 0 && (
                        <>
                          <SectionTitle>Termene dosar</SectionTitle>
                          {d.termene.map((t) => (
                            <div
                              key={String(t.id ?? `${t.dataTermen ?? ""}-${t.solutie ?? ""}`)}
                              className="ml-2 mb-1"
                            >
                              <FieldRow label="Dată" value={t.dataTermen} />
                              <FieldRow label="Soluție" value={t.solutie} />
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="enrichment">
              <pre className="mt-2 max-h-[60vh] overflow-auto rounded-lg border border-s700 bg-s950 p-4 text-xs text-t2">
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </TabsContent>

            <TabsContent value="logs">
              <div className="mt-2 space-y-2">
                {enrichmentLogs.length === 0 ? (
                  <p className="py-4 text-sm text-t3">Niciun log de enrichment disponibil.</p>
                ) : (
                  enrichmentLogs.map((log) => (
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
