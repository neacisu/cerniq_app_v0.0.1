import { useState } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
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

const MOCK_INVOICES: Invoice[] = [
  {
    nr: "FV-2026-001",
    company: "SC AgroSud SRL",
    cui: "12345678",
    amount: "RON 23.000",
    amountNum: 23000,
    vat: "RON 4.370",
    vatNum: 4370,
    status: "PAID",
    spv: "ok",
    date: "2026-03-15",
    dueDate: "2026-04-15",
    overdue: false,
    eFacturaId: "EF-2026-18234",
  },
  {
    nr: "FV-2026-002",
    company: "Cooperativa Agriland",
    cui: "87654321",
    amount: "RON 12.000",
    amountNum: 12000,
    vat: "RON 2.280",
    vatNum: 2280,
    status: "PENDING",
    spv: "pending",
    date: "2026-03-18",
    dueDate: "2026-04-18",
    overdue: true,
  },
  {
    nr: "FV-2026-003",
    company: "OUAI Ialomița Nord",
    cui: "11223344",
    amount: "RON 8.200",
    amountNum: 8200,
    vat: "RON 1.558",
    vatNum: 1558,
    status: "PAID",
    spv: "ok",
    date: "2026-03-10",
    dueDate: "2026-04-10",
    overdue: false,
    eFacturaId: "EF-2026-17890",
  },
  {
    nr: "FV-2026-004",
    company: "SC Ferma Dunărea SA",
    cui: "99887766",
    amount: "RON 45.000",
    amountNum: 45000,
    vat: "RON 8.550",
    vatNum: 8550,
    status: "OVERDUE",
    spv: "pending",
    date: "2026-01-20",
    dueDate: "2026-02-20",
    overdue: true,
  },
  {
    nr: "FV-2026-005",
    company: "Agro Nord Impex SRL",
    cui: "55667788",
    amount: "RON 16.800",
    amountNum: 16800,
    vat: "RON 3.192",
    vatNum: 3192,
    status: "PENDING",
    spv: "pending",
    date: "2026-04-01",
    dueDate: "2026-05-01",
    overdue: false,
  },
];

function InvoiceDrawer({ inv, onClose }: { readonly inv: Invoice; readonly onClose: () => void }) {
  function handleDownload() {
    toast.success(`PDF ${inv.nr} descărcat.`);
  }
  function handleRetransmit() {
    toast.success(`Factura ${inv.nr} retransmisă la SPV ANAF e-Factura.`);
  }
  function handleSendReminder() {
    toast.info(`Reminder plată trimis către ${inv.company}.`);
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

  const paid = MOCK_INVOICES.filter((i) => i.status === "PAID").length;
  const overdue = MOCK_INVOICES.filter((i) => i.overdue).length;
  const totalVat = MOCK_INVOICES.reduce((s, i) => s + i.vatNum, 0);

  return (
    <PageWrapper title="e-Factura SPV ANAF" actions={<EtapaBadge label="Etapa 3" />}>
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <KpiCard
          label="Total Facturi"
          value={String(MOCK_INVOICES.length)}
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
              {MOCK_INVOICES.map((inv) => (
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
