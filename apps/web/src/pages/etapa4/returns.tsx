import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchOrdersList, type GoldOrderListRow } from "@/lib/etapa4-api.js";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { Button } from "@/components/ui/index.js";
import { Card, CardBody } from "@/components/ui/card.js";
import { SBadge } from "@/components/ui/badge.js";
import { EmptyState } from "@/components/feedback/EmptyState.js";
import { X, Package, Building2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

type RmaStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";

interface Rma {
  id: string;
  orderRef: string;
  company: string;
  cui: string;
  status: RmaStatus;
  reason: string;
  date: string;
  value: string;
  valueNum: number;
  carrier: string;
  awb?: string;
  products: string[];
  contactEmail: string;
}

function orderRowToRma(o: GoldOrderListRow): Rma {
  const st = o.status;
  const status: RmaStatus = st === "RETURNED" ? "COMPLETED" : "PENDING";

  const amt = Number(o.totalAmount);
  return {
    id: o.id,
    orderRef: o.orderNumber,
    company: o.companyName?.trim() ? o.companyName : "—",
    cui: o.cui?.trim() ? o.cui : "—",
    status,
    reason: `Comandă în starea „${st}” (flux retur / livrare eșuată).`,
    date: (o.updatedAt ?? o.createdAt).slice(0, 10),
    value: `${o.currency} ${amt.toLocaleString("ro-RO")}`,
    valueNum: amt,
    carrier: "—",
    products: [],
    contactEmail: "—",
  };
}

function RmaDetailDrawer({
  rma,
  onApprove,
  onReject,
  onClose,
}: {
  readonly rma: Rma;
  readonly onApprove: (id: string) => void;
  readonly onReject: (id: string) => void;
  readonly onClose: () => void;
}) {
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
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-t1)" }}>
              {rma.orderRef}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-t3)" }}>{rma.company}</div>
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
          <SBadge status={rma.status} />
          <span style={{ fontSize: 11, color: "var(--color-t3)" }}>{rma.date}</span>
        </div>

        <div
          style={{
            padding: "10px 12px",
            background: "color-mix(in oklch, var(--color-wa) 10%, transparent)",
            border: "1px solid color-mix(in oklch, var(--color-wa) 30%, transparent)",
            borderRadius: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <AlertTriangle
              size={14}
              color="var(--color-wa)"
              style={{ marginTop: 1, flexShrink: 0 }}
            />
            <span style={{ fontSize: 12, color: "var(--color-t2)" }}>{rma.reason}</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 11 }}>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>VALOARE</div>
            <div style={{ color: "var(--color-b5)", fontWeight: 700 }}>{rma.value}</div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>CUI</div>
            <div style={{ color: "var(--color-t2)", fontFamily: "var(--font-mono)" }}>
              {rma.cui}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>CURIER</div>
            <div style={{ color: "var(--color-t2)" }}>{rma.carrier}</div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>CONTACT</div>
            <div style={{ color: "var(--color-t2)", fontSize: 10 }}>{rma.contactEmail}</div>
          </div>
        </div>

        {rma.awb && (
          <div
            style={{
              padding: "8px 12px",
              background: "color-mix(in oklch, var(--color-neuron-logistics) 10%, transparent)",
              border:
                "1px solid color-mix(in oklch, var(--color-neuron-logistics) 30%, transparent)",
              borderRadius: 6,
              fontSize: 11,
            }}
          >
            <div
              style={{ color: "var(--color-neuron-logistics)", fontWeight: 600, marginBottom: 2 }}
            >
              AWB Retur
            </div>
            <div style={{ fontFamily: "var(--font-mono)", color: "var(--color-t1)" }}>
              {rma.awb}
            </div>
          </div>
        )}

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-t3)", marginBottom: 8 }}>
            PRODUSE RETURNATE
          </div>
          {rma.products.length === 0 ? (
            <div style={{ fontSize: 11, color: "var(--color-t4)" }}>
              Nu există poziții de marfă atașate în acest view (datele vin din comanda Gold).
            </div>
          ) : (
            rma.products.map((p) => (
              <div
                key={p}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 0",
                  borderBottom: "1px solid var(--color-s800)",
                  fontSize: 12,
                  color: "var(--color-t2)",
                }}
              >
                <Package size={10} color="var(--color-t3)" />
                {p}
              </div>
            ))
          )}
        </div>

        {rma.status === "PENDING" && (
          <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
            <Button
              size="sm"
              variant="success"
              style={{ flex: 1, gap: 6 }}
              onClick={() => {
                onApprove(rma.id);
                onClose();
              }}
            >
              <CheckCircle2 size={13} /> Aprobă
            </Button>
            <Button
              size="sm"
              variant="outline"
              style={{ flex: 1, gap: 6, color: "var(--color-er)", borderColor: "var(--color-er)" }}
              onClick={() => {
                onReject(rma.id);
                onClose();
              }}
            >
              <XCircle size={13} /> Respinge
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Returns() {
  const [localStatus, setLocalStatus] = useState<Record<string, RmaStatus>>({});
  const [selectedRma, setSelectedRma] = useState<Rma | null>(null);

  const results = useQueries({
    queries: (["RETURNED", "RETURN_PROCESSING", "DELIVERY_FAILED"] as const).map((status) => ({
      queryKey: ["etapa4", "orders", "returns", status],
      queryFn: () => fetchOrdersList({ status, limit: 50, page: 1 }),
    })),
  });

  const rmas = useMemo(() => {
    const byId = new Map<string, Rma>();
    for (const q of results) {
      const rows = q.data?.data ?? [];
      for (const row of rows) {
        byId.set(row.id, orderRowToRma(row));
      }
    }
    return [...byId.values()].map((r) => ({
      ...r,
      status: localStatus[r.id] ?? r.status,
    }));
  }, [results, localStatus]);

  const loadError = results.some((q) => q.isError);

  const handleApprove = (id: string) => {
    setLocalStatus((prev) => ({ ...prev, [id]: "APPROVED" }));
    toast.message(
      "Aprobarea RMA nu apelează încă un endpoint API — actualizați starea comenzii prin fluxul E4 (PATCH /orders) sau worker.",
    );
  };

  const handleReject = (id: string) => {
    setLocalStatus((prev) => ({ ...prev, [id]: "REJECTED" }));
    toast.message("Respingerea RMA este doar locală în UI până la integrarea API.");
  };

  const totalValue = rmas.reduce((s, r) => s + r.valueNum, 0);
  const pendingCount = rmas.filter((r) => r.status === "PENDING").length;

  return (
    <PageWrapper title="Returns RMA" actions={<EtapaBadge label="Etapa 4" />}>
      {loadError && (
        <div className="mb-4 rounded border border-er/40 bg-er/10 px-4 py-3 text-sm text-er">
          Eroare la încărcarea comenzilor pentru retur.
        </div>
      )}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-s700 bg-s900/80 p-4">
          <div className="text-2xl font-bold text-t1">{rmas.length}</div>
          <div className="text-sm text-t3">Total RMA-uri</div>
        </div>
        <div className="rounded-lg border border-s700 bg-s900/80 p-4">
          <div className="text-2xl font-bold text-wa">{pendingCount}</div>
          <div className="text-sm text-t3">În Așteptare</div>
        </div>
        <div className="rounded-lg border border-s700 bg-s900/80 p-4">
          <div className="text-2xl font-bold text-ok">RON {totalValue.toLocaleString()}</div>
          <div className="text-sm text-t3">Valoare Totală</div>
        </div>
      </div>

      {rmas.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rmas.map((r) => (
            <Card key={r.id}>
              <CardBody>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-sm text-t3">{r.orderRef}</span>
                  <SBadge status={r.status} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Building2 size={12} color="var(--color-t3)" />
                  <span className="font-medium text-t1">{r.company}</span>
                </div>
                <p className="text-sm text-t3 mb-2 line-clamp-2">{r.reason}</p>
                <div className="flex justify-between text-xs text-t3 mb-4">
                  <span>{r.date}</span>
                  <span className="font-medium text-t2">{r.value}</span>
                </div>
                <div className="flex gap-2">
                  {r.status === "PENDING" && (
                    <Button
                      variant="success"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleApprove(r.id)}
                    >
                      Aprobă
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedRma(r)}
                  >
                    Detalii
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Nicio cerere RMA" description="Toate cererile au fost procesate." />
      )}

      {selectedRma && (
        <RmaDetailDrawer
          rma={selectedRma}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setSelectedRma(null)}
        />
      )}
    </PageWrapper>
  );
}
