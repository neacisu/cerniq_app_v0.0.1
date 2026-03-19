import { Drawer } from "./Drawer.js";
import { Spinner } from "@/components/ui/spinner.js";
import { Badge } from "@/components/ui/badge.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.js";
import { useBronzeContactDetail } from "@/hooks/use-etapa1.js";

const EXTRACTED_FIELDS: { key: string; label: string }[] = [
  { key: "extractedName", label: "Nume" },
  { key: "extractedCui", label: "CUI" },
  { key: "extractedCuiRaw", label: "CUI (raw)" },
  { key: "extractedNrRegCom", label: "Nr. Reg. Com." },
  { key: "extractedNrRegComRaw", label: "Nr. Reg. Com. (raw)" },
  { key: "extractedEmail", label: "Email" },
  { key: "extractedPhone", label: "Telefon" },
  { key: "extractedJudet", label: "Județ" },
  { key: "extractedLocalitate", label: "Localitate" },
  { key: "extractedAddress", label: "Adresa" },
  { key: "extractedCaen", label: "CAEN" },
];

const STATUS_FIELDS: { key: string; label: string }[] = [
  { key: "sourceType", label: "Sursa" },
  { key: "processingStatus", label: "Status procesare" },
  { key: "identityStatus", label: "Status identitate" },
  { key: "isDuplicate", label: "Duplicat" },
  { key: "duplicateOfId", label: "Duplicat după ID" },
  { key: "resolvedCompanyId", label: "Company ID rezolvat" },
  { key: "promotedToSilverId", label: "Promovat la Silver ID" },
  { key: "doNotProcess", label: "Do Not Process" },
  { key: "createdAt", label: "Creat la" },
  { key: "updatedAt", label: "Actualizat la" },
  { key: "id", label: "ID" },
  { key: "tenantId", label: "Tenant ID" },
];

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

type Props = Readonly<{ open: boolean; id: string | null; onClose: () => void }>;

export function BronzeContactDrawer({ open, id, onClose }: Props) {
  const { data: response, isPending, isError, error } = useBronzeContactDetail(id ?? undefined);
  const item = (response?.data ?? {}) as Record<string, unknown>;
  const metadata = (item.metadata as Record<string, unknown> | undefined) ?? {};
  const rawPayload = (item.rawPayload as Record<string, unknown> | undefined) ?? {};
  const identityMeta =
    (item.identityResolutionMetadata as Record<string, unknown> | undefined) ?? {};

  const title = id ? String(item.extractedName ?? "Contact Bronze") : "Contact Bronze";
  const subtitle = item.extractedCui ? `CUI: ${String(item.extractedCui)}` : undefined;

  return (
    <Drawer open={open} onClose={onClose} title={title} subtitle={subtitle}>
      {isPending && (
        <div className="flex items-center justify-center py-16">
          <Spinner size={28} />
        </div>
      )}
      {isError && (
        <div className="rounded-lg border border-er/30 bg-er/10 p-4 text-sm text-er">
          Eroare la incarcarea contactului: {error?.message ?? "Eroare necunoscuta"}
        </div>
      )}
      {!isPending && !isError && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="info">{String(item.processingStatus ?? "—")}</Badge>
            {Boolean(item.identityStatus) && (
              <Badge variant="brand">{String(item.identityStatus)}</Badge>
            )}
            {item.isDuplicate === true && <Badge variant="warning">Duplicat</Badge>}
          </div>
          <Tabs defaultValue="extracted">
            <TabsList>
              <TabsTrigger value="extracted">Date extrase</TabsTrigger>
              <TabsTrigger value="status">Status & IDs</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="payload">Payload</TabsTrigger>
              <TabsTrigger value="raw">Raw JSON</TabsTrigger>
            </TabsList>

            <TabsContent value="extracted">
              <div className="mt-2">
                {EXTRACTED_FIELDS.map(({ key, label }) => (
                  <FieldRow key={key} label={label} value={item[key]} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="status">
              <div className="mt-2">
                {STATUS_FIELDS.map(({ key, label }) => (
                  <FieldRow key={key} label={label} value={item[key]} />
                ))}
                {Object.keys(identityMeta).length > 0 && (
                  <>
                    <p className="mt-3 mb-1 text-xs font-semibold text-t3">Identity Resolution</p>
                    {Object.entries(identityMeta).map(([k, v]) => (
                      <FieldRow key={k} label={k} value={v} />
                    ))}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="metadata">
              <div className="mt-2">
                {[
                  { key: "batchId", label: "Batch ID" },
                  { key: "rowNumber", label: "Nr. rand" },
                  { key: "sheetName", label: "Sheet" },
                  { key: "importedAt", label: "Importat la" },
                  { key: "sourceType", label: "Sursa" },
                ].map(({ key, label }) => (
                  <FieldRow key={key} label={label} value={metadata[key]} />
                ))}
                {Boolean(metadata.cuiValidation) && (
                  <>
                    <p className="mt-3 mb-1 text-xs font-semibold text-t3">Validare CUI</p>
                    {Object.entries(metadata.cuiValidation as Record<string, unknown>).map(
                      ([k, v]) => (
                        <FieldRow key={k} label={k} value={v} />
                      ),
                    )}
                  </>
                )}
                {Boolean(metadata.nameNormalization) && (
                  <>
                    <p className="mt-3 mb-1 text-xs font-semibold text-t3">Normalizare Nume</p>
                    {Object.entries(metadata.nameNormalization as Record<string, unknown>).map(
                      ([k, v]) => (
                        <FieldRow key={k} label={k} value={v} />
                      ),
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="payload">
              {Object.keys(rawPayload).length === 0 ? (
                <p className="mt-2 text-sm text-t3">Niciun payload disponibil.</p>
              ) : (
                <div className="mt-2">
                  {Object.entries(rawPayload).map(([k, v]) => (
                    <FieldRow
                      key={k}
                      label={k}
                      value={typeof v === "object" ? JSON.stringify(v) : v}
                    />
                  ))}
                </div>
              )}
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
