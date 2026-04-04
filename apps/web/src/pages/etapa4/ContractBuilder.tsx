/**
 * ContractBuilder — contracte Gold + acțiune DocuSign (coadă worker).
 * Date din GET /api/v1/contracts; POST send-docusign conform API.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { FileCheck, PenTool, Building2, User, Calendar, Download } from "lucide-react";
import { cn } from "@/lib/utils.js";
import { EmptyState } from "@/components/feedback/EmptyState.js";
import {
  fetchContractsList,
  postContractSendDocusign,
  type ContractListRow,
} from "@/lib/etapa4-api.js";

function statusColor(status: string): string {
  if (status === "SIGNED") return "var(--color-ok)";
  if (status === "EXPIRED" || status === "CANCELLED") return "var(--color-er)";
  if (status === "DRAFT" || status === "PENDING_SIGNATURE") return "var(--color-wa)";
  return "var(--color-in)";
}

function clausesUsedList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  return [];
}

function ContractListItem({
  row,
  selected,
  onSelect,
}: {
  readonly row: ContractListRow;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const color = statusColor(row.status);
  const title = row.orderNumber?.trim()
    ? `Contract · ${row.orderNumber}`
    : `Contract ${row.id.slice(0, 8)}…`;
  return (
    <Card
      className={cn("cursor-pointer transition-all", selected && "border-b5")}
      onClick={onSelect}
      style={{ borderColor: selected ? "var(--color-b5)" : undefined }}
    >
      <CardBody className="py-3 px-4">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-t1)" }}>{title}</span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              color,
              fontWeight: 600,
              border: `1px solid ${color}`,
              padding: "1px 5px",
              borderRadius: 3,
            }}
          >
            {row.status}
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--color-t3)", marginBottom: 4 }}>
          <Building2 size={9} style={{ marginRight: 3 }} />
          {row.companyName?.trim() ? row.companyName : "—"}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: "var(--color-t4)",
          }}
        >
          <span>Risc: {row.riskTier}</span>
          <span>Exp: {row.expiresAt ? row.expiresAt.slice(0, 10) : "—"}</span>
        </div>
      </CardBody>
    </Card>
  );
}

export function ContractBuilder() {
  const qc = useQueryClient();
  const listQuery = useQuery({
    queryKey: ["etapa4", "contracts", "list"],
    queryFn: () => fetchContractsList({ limit: 100, page: 1 }),
  });

  const rows = useMemo(() => listQuery.data?.data ?? [], [listQuery.data?.data]);
  const [pickedContractId, setPickedContractId] = useState<string | null>(null);

  const effectiveContractId = useMemo(() => {
    if (rows.length === 0) return null;
    if (pickedContractId !== null && rows.some((r) => r.id === pickedContractId)) {
      return pickedContractId;
    }
    return rows[0].id;
  }, [rows, pickedContractId]);

  const selected = useMemo(
    () =>
      effectiveContractId === null ? undefined : rows.find((r) => r.id === effectiveContractId),
    [rows, effectiveContractId],
  );

  const signedCount = rows.filter((c) => c.status === "SIGNED").length;
  const pendingCount = rows.filter((c) =>
    ["DRAFT", "PENDING_SIGNATURE", "SENT_DOCUSIGN"].includes(c.status),
  ).length;
  const expiredCount = rows.filter((c) => c.status === "EXPIRED").length;

  const clauses = selected ? clausesUsedList(selected.clausesUsed) : [];

  async function handleSendDocusign() {
    if (!selected) return;
    try {
      await postContractSendDocusign(selected.id);
      toast.success("Job DocuSign pus în coadă.");
      await qc.invalidateQueries({ queryKey: ["etapa4", "contracts", "list"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Eroare send-docusign");
    }
  }

  function handleDownloadPdf() {
    const url = selected?.signedPdfUrl ?? selected?.pdfUrl;
    if (url) {
      globalThis.window?.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    toast.message("Nu există pdfUrl / signedPdfUrl pentru acest contract.");
  }

  return (
    <PageWrapper title="Contract Builder" actions={<EtapaBadge label="Etapa 4" />}>
      {listQuery.isError && (
        <div className="mb-4 rounded border border-er/40 bg-er/10 px-4 py-3 text-sm text-er">
          Eroare la încărcarea contractelor.
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <KpiCard
          label="Total contracte"
          value={String(rows.length)}
          icon="FileCheck"
          color="var(--color-b5)"
        />
        <KpiCard
          label="Semnate"
          value={String(signedCount)}
          icon="CheckCircle2"
          color="var(--color-ok)"
        />
        <KpiCard
          label="În curs semnare"
          value={String(pendingCount)}
          icon="Clock"
          color="var(--color-wa)"
        />
        <KpiCard
          label="Expirate"
          value={String(expiredCount)}
          icon="XCircle"
          color="var(--color-er)"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-t3)",
              letterSpacing: "0.05em",
            }}
          >
            CONTRACTE
          </div>
          {listQuery.isSuccess && rows.length === 0 ? (
            <EmptyState
              title="Fără contracte"
              description="Nu există înregistrări gold_contracts."
            />
          ) : (
            rows.map((c) => (
              <ContractListItem
                key={c.id}
                row={c}
                selected={effectiveContractId === c.id}
                onSelect={() => setPickedContractId(c.id)}
              />
            ))
          )}
        </div>

        {selected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card>
              <CardBody className="py-4 px-5">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <FileCheck size={18} color="var(--color-neuron-contract)" />
                      <span style={{ fontSize: 15, fontWeight: 800, color: "var(--color-t1)" }}>
                        {selected.orderNumber?.trim()
                          ? `Contract · ${selected.orderNumber}`
                          : `Contract ${selected.id.slice(0, 8)}…`}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-t3)" }}>
                      <Building2 size={10} style={{ marginRight: 4 }} />
                      {selected.companyName ?? "—"} • CUI: {selected.cui ?? "—"}
                    </div>
                    {selected.docusignEnvelopeId && (
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--color-t4)",
                          fontFamily: "var(--font-mono)",
                          marginTop: 2,
                        }}
                      >
                        DocuSign envelope: {selected.docusignEnvelopeId}
                      </div>
                    )}
                    {selected.docusignStatus && (
                      <div style={{ fontSize: 10, color: "var(--color-t3)", marginTop: 2 }}>
                        Status DocuSign: {selected.docusignStatus}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <Button
                      variant="outline"
                      size="sm"
                      style={{ gap: 4, fontSize: 11 }}
                      onClick={handleDownloadPdf}
                    >
                      <Download size={12} />
                      PDF
                    </Button>
                    {["DRAFT", "PENDING_SIGNATURE"].includes(selected.status) && (
                      <Button
                        size="sm"
                        style={{ gap: 4, fontSize: 11 }}
                        onClick={handleSendDocusign}
                      >
                        <PenTool size={12} />
                        Trimite DocuSign
                      </Button>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--color-t3)" }}>
                  <span>
                    <Calendar size={10} style={{ marginRight: 3 }} />
                    Creat: {selected.createdAt.slice(0, 10)}
                  </span>
                  <span>Expiră: {selected.expiresAt ? selected.expiresAt.slice(0, 10) : "—"}</span>
                  <span>Semnat la: {selected.signedAt ? selected.signedAt.slice(0, 10) : "—"}</span>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Semnatari</CardTitle>
              </CardHeader>
              <CardBody>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--color-t3)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <User size={14} />
                  Lista semnatarilor nu este returnată de GET /contracts — folosiți DocuSign
                  envelope / PDF.
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clauze (coduri) — {clauses.length}</CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                {clauses.length === 0 ? (
                  <div className="p-4 text-sm text-t3">
                    Nicio clauză înregistrată în clausesUsed.
                  </div>
                ) : (
                  clauses.map((code) => (
                    <div
                      key={code}
                      style={{
                        borderBottom: "1px solid var(--color-s800)",
                        padding: "10px 16px",
                        fontSize: 12,
                        color: "var(--color-t2)",
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{code}</span>
                      <div style={{ fontSize: 11, color: "var(--color-t4)", marginTop: 4 }}>
                        Textul clauzei este în documentul PDF generat de worker.
                      </div>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>
          </div>
        ) : (
          <Card>
            <CardBody className="py-8">
              <EmptyState
                title="Selectează un contract"
                description="Alege din lista din stânga."
              />
            </CardBody>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
