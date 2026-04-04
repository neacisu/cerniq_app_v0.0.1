import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Badge, SBadge } from "@/components/ui/index.js";
import { Button } from "@/components/ui/button.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { cn } from "@/lib/utils.js";
import { X, Building2, AlertTriangle, CheckCircle2, FileText, Search } from "lucide-react";
import { fetchTenantPayments, type TenantPaymentRow } from "@/lib/etapa4-api.js";
import { EmptyState } from "@/components/feedback/EmptyState.js";

type UiPayStatus = "MATCHED" | "UNMATCHED" | "DISPUTED" | "PROCESSING";

function mapReconciliationStatus(s: string): UiPayStatus {
  if (s === "MATCHED_EXACT" || s === "MATCHED_FUZZY" || s === "MANUAL_MATCHED") return "MATCHED";
  if (s === "DISPUTED") return "DISPUTED";
  if (s === "UNMATCHED") return "UNMATCHED";
  if (s === "PENDING") return "PROCESSING";
  return "PROCESSING";
}

interface PaymentView {
  id: string;
  date: string;
  company: string;
  cui: string;
  amount: number;
  type: "PAYMENT";
  status: UiPayStatus;
  currency: string;
  reference?: string;
  invoiceNr?: string;
  bankAccount?: string;
}

function rowToPaymentView(r: TenantPaymentRow): PaymentView {
  const company = r.companyName?.trim() ? r.companyName : (r.counterpartyName?.trim() ?? "—");
  const cui = r.cui?.trim() ? r.cui : "—";
  const dt = r.receivedAt ?? r.createdAt;
  const date = dt ? dt.slice(0, 10) : "—";
  return {
    id: r.id,
    date,
    company,
    cui,
    amount: Number(r.amount),
    type: "PAYMENT",
    status: mapReconciliationStatus(r.reconciliationStatus),
    currency: r.currency,
    reference: r.reference ?? undefined,
    bankAccount: r.counterpartyIban ?? undefined,
  };
}

function PaymentDrawer({ p, onClose }: { readonly p: PaymentView; readonly onClose: () => void }) {
  const [invoiceInput, setInvoiceInput] = useState(p.invoiceNr ?? "");

  function handleMatch() {
    toast.message(
      "Reconcilierea manuală nu este expusă prin POST în API — folosiți worker-ul E4 sau fluxul admin pentru reconcilieri.",
    );
    if (!invoiceInput.trim()) {
      toast.error("Introduceți referința facturii pentru uz intern.");
      return;
    }
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
              Plată {p.id.slice(0, 8)}…
            </div>
            <div style={{ fontSize: 11, color: "var(--color-t3)" }}>{p.date}</div>
          </div>
          <button
            type="button"
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
          <Badge variant="neutral">{p.type}</Badge>
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
                color: "var(--color-ok)",
                fontWeight: 800,
                fontSize: 16,
                fontFamily: "var(--font-mono)",
              }}
            >
              +{p.amount.toLocaleString("ro-RO")} {p.currency}
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
              Notă internă / referință (fără POST API dedicat încă):
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
                <CheckCircle2 size={12} /> Salvează notă
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
  const [selected, setSelected] = useState<PaymentView | null>(null);

  const payQuery = useQuery({
    queryKey: ["etapa4", "orders", "payments", "tenant"],
    queryFn: () => fetchTenantPayments({ limit: 100, page: 1 }),
  });

  const payments = useMemo(
    () => (payQuery.data?.data ?? []).map(rowToPaymentView),
    [payQuery.data?.data],
  );

  const matched = payments.filter((p) => p.status === "MATCHED").length;
  const unmatched = payments.filter((p) => p.status === "UNMATCHED").length;
  const totalRon = payments.filter((p) => p.currency === "RON").reduce((s, p) => s + p.amount, 0);

  return (
    <PageWrapper title="Payments — Reconciliere" actions={<EtapaBadge label="Etapa 4" />}>
      {payQuery.isError && (
        <div className="mb-4 rounded border border-er/40 bg-er/10 px-4 py-3 text-sm text-er">
          Eroare la încărcarea plăților.
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard
          label="Total RON (din listă)"
          value={`RON ${totalRon.toLocaleString("ro-RO")}`}
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
          <CardTitle>Plăți înregistrate (gold_payments)</CardTitle>
        </CardHeader>
        <CardBody className="p-0 overflow-x-auto">
          {payQuery.isSuccess && payments.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Fără plăți" description="Nu există plăți pentru tenant." />
            </div>
          ) : (
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
                    <td className="py-3 px-4 font-mono font-semibold text-ok">
                      +{p.amount.toLocaleString("ro-RO")} {p.currency}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="neutral">{p.type}</Badge>
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
                          <Search size={11} /> Detalii
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {selected && <PaymentDrawer p={selected} onClose={() => setSelected(null)} />}
    </PageWrapper>
  );
}
