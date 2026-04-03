import { useState } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Badge, SBadge } from "@/components/ui/index.js";
import { Button } from "@/components/ui/button.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { cn } from "@/lib/utils.js";
import { X, Building2, AlertTriangle, CheckCircle2, FileText, Search } from "lucide-react";

type PaymentStatus = "MATCHED" | "UNMATCHED" | "DISPUTED" | "PROCESSING";
type PaymentType = "PAYMENT" | "REFUND" | "ADVANCE";

interface Payment {
  id: string;
  date: string;
  company: string;
  cui: string;
  amount: number;
  type: PaymentType;
  status: PaymentStatus;
  currency: "RON" | "EUR";
  reference?: string;
  invoiceNr?: string;
  bankAccount?: string;
}

const MOCK_PAYMENTS: Payment[] = [
  {
    id: "P001",
    date: "2026-04-01",
    company: "SC AgroSud SRL",
    cui: "12345678",
    amount: 23000,
    type: "PAYMENT",
    status: "MATCHED",
    currency: "RON",
    reference: "Factura FV-2026-001",
    invoiceNr: "FV-2026-001",
    bankAccount: "RO49AAAA1B31007593840000",
  },
  {
    id: "P002",
    date: "2026-03-30",
    company: "Cooperativa Agriland",
    cui: "87654321",
    amount: -500,
    type: "REFUND",
    status: "MATCHED",
    currency: "RON",
    reference: "Retur marfă RMA-002",
    invoiceNr: "FV-2026-002R",
  },
  {
    id: "P003",
    date: "2026-03-28",
    company: "OUAI Ialomița Nord",
    cui: "11223344",
    amount: 8000,
    type: "PAYMENT",
    status: "UNMATCHED",
    currency: "RON",
    bankAccount: "RO66BRDE445SV28291224450",
    reference: "Transfer fără referință factură",
  },
  {
    id: "P004",
    date: "2026-03-25",
    company: "SC Ferma Dunărea SA",
    cui: "99887766",
    amount: 45000,
    type: "PAYMENT",
    status: "MATCHED",
    currency: "RON",
    reference: "Factura FV-2026-004",
    invoiceNr: "FV-2026-004",
  },
  {
    id: "P005",
    date: "2026-04-02",
    company: "Agro Nord Impex SRL",
    cui: "55667788",
    amount: 10000,
    type: "ADVANCE",
    status: "UNMATCHED",
    currency: "RON",
    bankAccount: "RO12BTRL1234567890123456",
    reference: "Avans nedistribuit",
  },
];

function PaymentDrawer({
  p,
  onMatch,
  onClose,
}: {
  readonly p: Payment;
  readonly onMatch: (id: string) => void;
  readonly onClose: () => void;
}) {
  const [invoiceInput, setInvoiceInput] = useState(p.invoiceNr ?? "");

  function handleMatch() {
    if (!invoiceInput.trim()) {
      toast.error("Introdu numărul facturii pentru reconciliere.");
      return;
    }
    onMatch(p.id);
    toast.success(
      `Plata ${p.id} reconciliată cu ${invoiceInput}. Reconciliation worker declanșat.`,
    );
    onClose();
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
          gap: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-t1)" }}>
              Plată {p.id}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-t3)" }}>{p.date}</div>
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

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <SBadge status={p.status} />
          {(() => {
            let bv: "warning" | "brand" | "neutral" = "neutral";
            if (p.type === "REFUND") bv = "warning";
            else if (p.type === "ADVANCE") bv = "brand";
            return <Badge variant={bv}>{p.type}</Badge>;
          })()}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 11 }}>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>CLIENT</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Building2 size={10} color="var(--color-t3)" />
              <span style={{ color: "var(--color-t1)", fontWeight: 600 }}>{p.company}</span>
            </div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>CUI</div>
            <div style={{ color: "var(--color-t2)", fontFamily: "var(--font-mono)" }}>{p.cui}</div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>SUMĂ</div>
            <div
              style={{
                color: p.amount >= 0 ? "var(--color-ok)" : "var(--color-er)",
                fontWeight: 800,
                fontSize: 16,
                fontFamily: "var(--font-mono)",
              }}
            >
              {p.amount >= 0 ? "+" : ""}
              {p.amount.toLocaleString()} {p.currency}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>REFERINȚĂ</div>
            <div style={{ color: "var(--color-t2)", fontSize: 10 }}>{p.reference ?? "—"}</div>
          </div>
        </div>

        {p.bankAccount && (
          <div
            style={{
              padding: "8px 10px",
              background: "var(--color-s800)",
              borderRadius: 4,
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              color: "var(--color-t3)",
            }}
          >
            IBAN: {p.bankAccount}
          </div>
        )}

        {p.status === "UNMATCHED" && (
          <div
            style={{
              padding: "12px",
              background: "color-mix(in oklch, var(--color-wa) 8%, transparent)",
              border: "1px solid color-mix(in oklch, var(--color-wa) 30%, transparent)",
              borderRadius: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <AlertTriangle size={13} color="var(--color-wa)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-wa)" }}>
                Plată nereconciliată
              </span>
            </div>
            <div style={{ fontSize: 11, color: "var(--color-t3)", marginBottom: 8 }}>
              Introduceți numărul facturii pentru reconciliere manuală:
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={invoiceInput}
                onChange={(e) => setInvoiceInput(e.target.value)}
                placeholder="ex: FV-2026-003"
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  background: "var(--color-s800)",
                  border: "1px solid var(--color-s600)",
                  borderRadius: 4,
                  color: "var(--color-t1)",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  outline: "none",
                }}
              />
              <Button size="sm" onClick={handleMatch} style={{ gap: 4 }}>
                <CheckCircle2 size={12} /> Match
              </Button>
            </div>
          </div>
        )}

        {p.invoiceNr && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "var(--color-ok)",
            }}
          >
            <FileText size={12} />
            Factură asociată: <strong>{p.invoiceNr}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

export function Payments() {
  const [payments, setPayments] = useState<Payment[]>(MOCK_PAYMENTS);
  const [selected, setSelected] = useState<Payment | null>(null);

  const handleMatch = (id: string) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "MATCHED" as PaymentStatus } : p)),
    );
  };

  const matched = payments.filter((p) => p.status === "MATCHED").length;
  const unmatched = payments.filter((p) => p.status === "UNMATCHED").length;
  const total = payments.filter((p) => p.amount > 0).reduce((s, p) => s + p.amount, 0);

  return (
    <PageWrapper title="Payments Revolut — Reconciliere" actions={<EtapaBadge label="Etapa 4" />}>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard
          label="Total Intrări"
          value={`RON ${total.toLocaleString()}`}
          icon="Wallet"
          color="var(--color-b5)"
        />
        <KpiCard
          label="Reconciliate"
          value={`${matched}/${payments.length}`}
          icon="CheckCircle"
          color="var(--color-ok)"
        />
        <KpiCard
          label="Nereconciliate"
          value={String(unmatched)}
          icon="AlertTriangle"
          color={unmatched > 0 ? "var(--color-wa)" : "var(--color-ok)"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Extras Revolut Business</CardTitle>
        </CardHeader>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-s700">
                <th className="text-left py-3 px-4 text-t3 font-medium">Data</th>
                <th className="text-left py-3 px-4 text-t3 font-medium">Client</th>
                <th className="text-left py-3 px-4 text-t3 font-medium">Sumă</th>
                <th className="text-left py-3 px-4 text-t3 font-medium">Tip</th>
                <th className="text-left py-3 px-4 text-t3 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-t3 font-medium">Referință</th>
                <th className="text-left py-3 px-4 text-t3 font-medium">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={cn(
                    "border-b border-s800 hover:bg-s800/50 cursor-pointer",
                    p.status === "UNMATCHED" && "bg-wa/5",
                  )}
                >
                  <td className="py-3 px-4 text-t3">{p.date}</td>
                  <td className="py-3 px-4 text-t1 font-medium">{p.company}</td>
                  <td
                    className={cn(
                      "py-3 px-4 font-mono font-semibold",
                      p.amount >= 0 ? "text-ok" : "text-er",
                    )}
                  >
                    {p.amount >= 0 ? "+" : ""}
                    {p.amount.toLocaleString()} {p.currency}
                  </td>
                  <td className="py-3 px-4">
                    {(() => {
                      let bv2: "warning" | "brand" | "neutral" = "neutral";
                      if (p.type === "REFUND") bv2 = "warning";
                      else if (p.type === "ADVANCE") bv2 = "brand";
                      return <Badge variant={bv2}>{p.type}</Badge>;
                    })()}
                  </td>
                  <td className="py-3 px-4">
                    <SBadge status={p.status} />
                  </td>
                  <td className="py-3 px-4 text-t3 text-xs max-w-32 truncate">
                    {p.reference ?? "—"}
                  </td>
                  <td className="py-3 px-4">
                    {p.status === "UNMATCHED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        style={{
                          fontSize: 10,
                          gap: 4,
                          borderColor: "var(--color-wa)",
                          color: "var(--color-wa)",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(p);
                        }}
                      >
                        <Search size={11} /> Reconciliază
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {selected && (
        <PaymentDrawer p={selected} onMatch={handleMatch} onClose={() => setSelected(null)} />
      )}
    </PageWrapper>
  );
}
