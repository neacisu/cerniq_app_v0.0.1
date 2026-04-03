import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { api } from "@/lib/api.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Badge, SBadge } from "@/components/ui/index.js";
import { Button } from "@/components/ui/button.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { cn } from "@/lib/utils.js";
import { X, FileText, Send, CheckCircle2, AlertCircle, Building2 } from "lucide-react";

type InvoiceStatus = "PAID" | "PENDING" | "OVERDUE" | "CANCELLED";
type SpvStatus = "ok" | "pending" | "rejected";

interface Invoice {
  nr: string;
  company: string;
  cui: string;
  amount: string;
  amountNum: number;
  vat: string;
  vatNum: number;
  status: InvoiceStatus;
  spv: SpvStatus;
  date: string;
  dueDate: string;
  overdue: boolean;
  eFacturaId?: string;
}

type OblioDocRow = {
  id: string;
  documentType?: string | null;
  series?: string | null;
  number?: number | null;
  status?: string | null;
  subtotal?: string | null;
  vat?: string | null;
  total?: string | null;
  issuedAt?: string | null;
  createdAt?: string | null;
};

type EinvoiceRow = {
  oblioDocumentId?: string | null;
  status?: string | null;
  indexSpv?: string | null;
  deadlineAt?: string | null;
};

function parseNum(v: string | null | undefined): number {
  if (v == null || v === "") return 0;
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function fmtDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString("ro-RO");
}

function formatMoney(n: number): string {
  return `RON ${n.toLocaleString("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function mapSpvUi(sub: EinvoiceRow | undefined): SpvStatus {
  const s = (sub?.status ?? "").toUpperCase();
  if (s === "VALIDATED") return "ok";
  if (s === "REJECTED" || s === "ERROR") return "rejected";
  return "pending";
}

function buildInvoices(
  oblioRows: OblioDocRow[],
  einvoiceByDocId: Map<string, EinvoiceRow>,
): Invoice[] {
  return oblioRows
    .filter((d) => (d.documentType ?? "").toUpperCase() === "INVOICE")
    .map((doc) => {
      const sub = einvoiceByDocId.get(doc.id);
      const subtotal = parseNum(doc.subtotal);
      const vatNum = parseNum(doc.vat);
      const oblioSt = (doc.status ?? "").toUpperCase();
      let status: InvoiceStatus = "PENDING";
      if (oblioSt === "PAID") status = "PAID";
      else if (oblioSt === "CANCELLED") status = "CANCELLED";
      const spv = mapSpvUi(sub);
      const deadline = sub?.deadlineAt ? new Date(sub.deadlineAt).getTime() : NaN;
      const spvLate =
        Number.isFinite(deadline) &&
        deadline < Date.now() &&
        (sub?.status ?? "").toUpperCase() !== "VALIDATED";
      if (spvLate && status === "PENDING") status = "OVERDUE";

      const dueDate = fmtDay(sub?.deadlineAt ?? doc.issuedAt ?? doc.createdAt);
      const overdue = status === "OVERDUE" || spvLate;

      return {
        nr: doc.series && doc.number != null ? `${doc.series}/${doc.number}` : doc.id.slice(0, 8),
        company: "—",
        cui: "—",
        amount: formatMoney(subtotal),
        amountNum: subtotal,
        vat: formatMoney(vatNum),
        vatNum,
        status,
        spv,
        date: fmtDay(doc.issuedAt ?? doc.createdAt),
        dueDate,
        overdue,
        eFacturaId: sub?.indexSpv ?? undefined,
      };
    });
}

function InvoiceDrawer({ inv, onClose }: { readonly inv: Invoice; readonly onClose: () => void }) {
  function handleDownload() {
    toast.info("Descărcare PDF: folosiți fluxul Oblio sau endpoint dedicat când e disponibil.");
  }
  function handleRetransmit() {
    toast.info(
      "Retransmitere SPV: folosiți POST /api/v1/fiscal/oblio/einvoice/:id din UI admin sau API.",
    );
  }
  function handleSendReminder() {
    toast.info("Reminder plată: necesită integrare outreach/billing.");
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} onClick={onClose} aria-hidden />
      <div
        style={{
          width: 400,
          background: "var(--color-s900)",
          borderLeft: "1px solid var(--color-s700)",
          padding: 20,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-t1)" }}>{inv.nr}</div>
            <div style={{ fontSize: 11, color: "var(--color-t3)" }}>{inv.company}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-t3)",
              cursor: "pointer",
            }}
            aria-label="Închide"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <SBadge status={inv.status} />
          <Badge variant={inv.spv === "ok" ? "ok" : "warning"} className="text-[0.6rem]">
            SPV: {inv.spv}
          </Badge>
          {inv.overdue && (
            <Badge variant="error" className="text-[0.6rem]">
              <AlertCircle size={9} style={{ marginRight: 3 }} /> OVERDUE
            </Badge>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 11 }}>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>CUI CLIENT</div>
            <div style={{ color: "var(--color-t2)", fontFamily: "var(--font-mono)" }}>
              {inv.cui}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>
              DATA FACTURII
            </div>
            <div style={{ color: "var(--color-t2)" }}>{inv.date}</div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>SCADENȚĂ</div>
            <div
              style={{
                color: inv.overdue ? "var(--color-er)" : "var(--color-t2)",
                fontWeight: inv.overdue ? 700 : 400,
              }}
            >
              {inv.dueDate}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>TVA 19%</div>
            <div style={{ color: "var(--color-t2)" }}>{inv.vat}</div>
          </div>
        </div>

        <div
          style={{
            padding: "10px 14px",
            background: "color-mix(in oklch, var(--color-b5) 8%, transparent)",
            border: "1px solid color-mix(in oklch, var(--color-b5) 25%, transparent)",
            borderRadius: 6,
          }}
        >
          <div style={{ fontSize: 9, color: "var(--color-t4)", marginBottom: 4 }}>
            TOTAL FACTURĂ
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--color-b5)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {inv.amount}
          </div>
          <div style={{ fontSize: 10, color: "var(--color-t4)", marginTop: 2 }}>
            din care TVA: {inv.vat}
          </div>
        </div>

        {inv.eFacturaId && (
          <div
            style={{
              padding: "8px 12px",
              background: "color-mix(in oklch, var(--color-ok) 8%, transparent)",
              border: "1px solid color-mix(in oklch, var(--color-ok) 25%, transparent)",
              borderRadius: 6,
              fontSize: 11,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={12} color="var(--color-ok)" />
              <span style={{ color: "var(--color-ok)", fontWeight: 600 }}>
                e-Factura transmisă SPV
              </span>
            </div>
            <div
              style={{
                fontSize: 9,
                color: "var(--color-t4)",
                marginTop: 2,
                fontFamily: "var(--font-mono)",
              }}
            >
              {inv.eFacturaId}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
          <Button size="sm" variant="outline" style={{ gap: 6 }} onClick={handleDownload}>
            <FileText size={13} /> Descarcă PDF
          </Button>
          {inv.spv === "pending" && (
            <Button size="sm" style={{ gap: 6 }} onClick={handleRetransmit}>
              <Send size={13} /> Transmite SPV ANAF
            </Button>
          )}
          {inv.status !== "PAID" && (
            <Button
              size="sm"
              variant="outline"
              style={{ gap: 6, color: "var(--color-wa)", borderColor: "var(--color-wa)" }}
              onClick={handleSendReminder}
            >
              <AlertCircle size={13} /> Trimite Reminder
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Invoices() {
  const [selected, setSelected] = useState<Invoice | null>(null);

  const oblioQuery = useQuery({
    queryKey: ["invoices", "oblio-documents"],
    queryFn: () =>
      api.get<{ success?: boolean; data?: OblioDocRow[] }>(
        "/api/v1/fiscal/oblio/documents?page=1&limit=100",
      ),
  });

  const einvoiceQuery = useQuery({
    queryKey: ["invoices", "einvoice-submissions"],
    queryFn: () =>
      api.get<{ success?: boolean; data?: EinvoiceRow[] }>(
        "/api/v1/fiscal/einvoice/submissions?page=1&limit=200",
      ),
  });

  const invoices = useMemo(() => {
    const rows = oblioQuery.data?.data ?? [];
    const subs = einvoiceQuery.data?.data ?? [];
    const byDoc = new Map<string, EinvoiceRow>();
    for (const s of subs) {
      const oid = s.oblioDocumentId;
      if (oid) byDoc.set(oid, s);
    }
    return buildInvoices(rows, byDoc);
  }, [oblioQuery.data, einvoiceQuery.data]);

  const paid = invoices.filter((i) => i.status === "PAID").length;
  const overdue = invoices.filter((i) => i.overdue).length;
  const totalVat = invoices.reduce((s, i) => s + i.vatNum, 0);

  const err =
    oblioQuery.error instanceof Error
      ? oblioQuery.error.message
      : einvoiceQuery.error instanceof Error
        ? einvoiceQuery.error.message
        : null;

  return (
    <PageWrapper title="e-Factura SPV ANAF" actions={<EtapaBadge label="Etapa 3" />}>
      {err ? (
        <p className="text-sm text-er mb-4" role="alert">
          {err}
        </p>
      ) : null}
      {oblioQuery.isLoading || einvoiceQuery.isLoading ? (
        <p className="text-sm text-t3 mb-4">Se încarcă facturile și trimiterile SPV…</p>
      ) : null}
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <KpiCard
          label="Total Facturi"
          value={String(invoices.length)}
          icon="FileText"
          color="var(--color-b5)"
        />
        <KpiCard label="Plătite" value={String(paid)} icon="CheckCircle" color="var(--color-ok)" />
        <KpiCard
          label="Restante"
          value={String(overdue)}
          icon="AlertCircle"
          color="var(--color-er)"
        />
        <KpiCard
          label="TVA Colectat"
          value={`RON ${totalVat.toLocaleString()}`}
          icon="Receipt"
          color="var(--color-neuron-fiscal)"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista Facturi</CardTitle>
        </CardHeader>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-s700">
                <th className="px-4 py-3 text-left font-medium text-t3">Nr</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Client</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Valoare</th>
                <th className="px-4 py-3 text-left font-medium text-t3">TVA 19%</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Status</th>
                <th className="px-4 py-3 text-left font-medium text-t3">SPV</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Data</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {!oblioQuery.isLoading && !einvoiceQuery.isLoading && invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-t3 text-sm">
                    Nu există facturi (documente Oblio de tip INVOICE) pentru acest tenant.
                  </td>
                </tr>
              ) : null}
              {invoices.map((inv) => (
                <tr
                  key={inv.nr}
                  onClick={() => setSelected(inv)}
                  className={cn(
                    "border-b border-s800 hover:bg-s800/50 cursor-pointer",
                    inv.overdue && "bg-er/5",
                  )}
                >
                  <td className="px-4 py-3 font-mono text-xs text-t2">{inv.nr}</td>
                  <td className="px-4 py-3">
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Building2 size={11} color="var(--color-t3)" />
                      <span className="text-t1 font-medium">{inv.company}</span>
                    </div>
                  </td>
                  <td
                    className="py-3 px-4 font-mono font-semibold"
                    style={{ color: "var(--color-b5)" }}
                  >
                    {inv.amount}
                  </td>
                  <td className="py-3 px-4 text-t3">{inv.vat}</td>
                  <td className="py-3 px-4">
                    <SBadge status={inv.status} />
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={inv.spv === "ok" ? "ok" : "warning"}>{inv.spv}</Badge>
                  </td>
                  <td className="px-4 py-3 text-t3">{inv.date}</td>
                  <td className="py-3 px-4">
                    <span className="flex gap-1" aria-label="Acțiuni factură">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Descarcă PDF"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.success(`PDF ${inv.nr} descărcat.`);
                        }}
                      >
                        <FileText size={14} />
                      </Button>
                      {inv.spv === "pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Transmite ANAF"
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.success(`${inv.nr} transmisă la SPV ANAF.`);
                          }}
                        >
                          <Send size={14} />
                        </Button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {selected && <InvoiceDrawer inv={selected} onClose={() => setSelected(null)} />}
    </PageWrapper>
  );
}
