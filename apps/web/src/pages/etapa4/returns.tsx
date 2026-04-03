import { useState } from "react";
import { toast } from "sonner";
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

const INITIAL_RMAS: Rma[] = [
  {
    id: "RMA-001",
    company: "SC AgroSud SRL",
    cui: "12345678",
    status: "PENDING",
    reason: "Produs defect — rata germinație sub 80%",
    date: "2026-04-01",
    value: "RON 450",
    valueNum: 450,
    carrier: "SAMEDAY",
    awb: "SDY-RMA-001234",
    products: ["Semințe Grâu PREMIUM Sorin F1 × 2 saci"],
    contactEmail: "andrei@agrosud.ro",
  },
  {
    id: "RMA-002",
    company: "Cooperativa Agriland",
    cui: "87654321",
    status: "APPROVED",
    reason: "Livrare greșită — produs incorect expediat",
    date: "2026-03-28",
    value: "RON 230",
    valueNum: 230,
    carrier: "FAN_COURIER",
    products: ["Fungicid Topsin M 70 WP × 1"],
    contactEmail: "ion@agriland.ro",
  },
  {
    id: "RMA-003",
    company: "OUAI Ialomița Nord",
    cui: "11223344",
    status: "PENDING",
    reason: "Ambalaj deteriorat în transport",
    date: "2026-03-30",
    value: "RON 120",
    valueNum: 120,
    carrier: "SAMEDAY",
    awb: "SDY-RMA-005678",
    products: ["Uree Granulată 46% × 1 sac 50kg"],
    contactEmail: "vasile@ouai-ialomita.ro",
  },
];

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
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-t1)" }}>{rma.id}</div>
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
          {rma.products.map((p) => (
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
          ))}
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
  const [rmas, setRmas] = useState<Rma[]>(INITIAL_RMAS);
  const [selectedRma, setSelectedRma] = useState<Rma | null>(null);

  const handleApprove = (id: string) => {
    setRmas((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "APPROVED" as RmaStatus } : r)),
    );
    toast.success(`RMA ${id} aprobat. AWB retur generat automat.`);
  };

  const handleReject = (id: string) => {
    setRmas((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "REJECTED" as RmaStatus } : r)),
    );
    toast.error(`RMA ${id} respins. Clientul a fost notificat.`);
  };

  const totalValue = rmas.reduce((s, r) => s + r.valueNum, 0);
  const pendingCount = rmas.filter((r) => r.status === "PENDING").length;

  return (
    <PageWrapper title="Returns RMA" actions={<EtapaBadge label="Etapa 4" />}>
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
                  <span className="font-mono text-sm text-t3">{r.id}</span>
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
