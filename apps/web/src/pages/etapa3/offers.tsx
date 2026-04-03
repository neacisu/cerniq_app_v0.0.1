import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { api } from "@/lib/api.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { Button, SBadge } from "@/components/ui/index.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { FileText, Send, X, Building2, Calendar, Euro } from "lucide-react";

type OfferStatus = "DRAFT" | "SENT" | "DELIVERED" | "PAID" | "REJECTED" | "EXPIRED";

interface Offer {
  id: string;
  company: string;
  cui: string;
  amount: string;
  amountNum: number;
  status: OfferStatus;
  date: string;
  validUntil: string;
  products: string[];
}

type NegListRow = {
  id: string;
  currentState?: string;
  companyName?: string | null;
  totalValue?: string | number | null;
  createdAt?: string;
  updatedAt?: string;
};

type NegDetail = {
  currentState?: string;
  totalValue?: string | number | null;
  createdAt?: string;
  updatedAt?: string;
  companyName?: string | null;
  company?: {
    denumire?: string | null;
    denumireComerciala?: string | null;
    cui?: string | null;
  } | null;
  items?: {
    productName?: string | null;
    sku?: string | null;
    quantity?: number | null;
  }[];
};

function formatMoney(v: string | number | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number.parseFloat(String(v));
  if (!Number.isFinite(n)) return String(v);
  return `RON ${n.toLocaleString("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function fmtDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString("ro-RO");
}

function stateToOfferStatus(state: string | undefined): OfferStatus {
  const s = (state ?? "DISCOVERY").toUpperCase();
  if (s === "PAID") return "PAID";
  if (s === "DEAD") return "REJECTED";
  if (s === "PROFORMA_SENT" || s === "INVOICED") return "DELIVERED";
  if (s === "DISCOVERY") return "DRAFT";
  return "SENT";
}

function mergeOffer(row: NegListRow, detail: NegDetail | undefined): Offer {
  const company =
    detail?.company?.denumire ??
    detail?.company?.denumireComerciala ??
    detail?.companyName ??
    row.companyName ??
    "—";
  const cui = detail?.company?.cui ?? "—";
  const totalVal = detail?.totalValue ?? row.totalValue;
  const amountNum =
    typeof totalVal === "number" ? totalVal : Number.parseFloat(String(totalVal ?? "0")) || 0;
  const items = detail?.items ?? [];
  const products =
    items.length > 0
      ? items.map((i) => {
          const label = i.productName?.trim() || i.sku?.trim() || "Produs";
          const q = i.quantity != null ? ` × ${i.quantity}` : "";
          return `${label}${q}`;
        })
      : ["Nicio linie în negociere (adăugați articole via API)"];

  return {
    id: row.id,
    company,
    cui,
    amount: formatMoney(totalVal),
    amountNum,
    status: stateToOfferStatus(detail?.currentState ?? row.currentState),
    date: fmtDay(detail?.createdAt ?? row.createdAt),
    validUntil: fmtDay(detail?.updatedAt ?? row.updatedAt),
    products,
  };
}

function OfferDetailDrawer({
  offer,
  onClose,
}: {
  readonly offer: Offer;
  readonly onClose: () => void;
}) {
  function handleDownload() {
    toast.info("Descărcarea PDF pentru ofertă necesită endpoint Oblio/export — nu este simulată.");
  }
  function handleSend() {
    toast.info(
      "Trimiterea ofertei pe email necesită integrare canal (WA/email) — nu este simulată.",
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
          width: 380,
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
              {offer.id.slice(0, 8)}…
            </div>
            <div style={{ fontSize: 11, color: "var(--color-t3)" }}>{offer.company}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-t3)",
              cursor: "pointer",
              fontSize: 18,
            }}
            aria-label="Închide"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 11 }}>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>STATUS</div>
            <SBadge status={offer.status} />
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>VALOARE</div>
            <div
              style={{ fontWeight: 700, color: "var(--color-b5)", fontFamily: "var(--font-mono)" }}
            >
              {offer.amount}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>CUI</div>
            <div style={{ color: "var(--color-t2)", fontFamily: "var(--font-mono)" }}>
              {offer.cui}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>
              VALABILĂ PÂNĂ
            </div>
            <div style={{ color: "var(--color-t2)" }}>{offer.validUntil}</div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-t3)", marginBottom: 8 }}>
            PRODUSE
          </div>
          {offer.products.map((p) => (
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
              <Euro size={10} color="var(--color-neuron-knowledge)" />
              {p}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
          <Button variant="outline" size="sm" style={{ flex: 1, gap: 4 }} onClick={handleDownload}>
            <FileText size={13} /> PDF
          </Button>
          {offer.status !== "PAID" && (
            <Button size="sm" style={{ flex: 1, gap: 4 }} onClick={handleSend}>
              <Send size={13} /> Trimite
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Offers() {
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  const listQuery = useQuery({
    queryKey: ["offers", "negotiation-list"],
    queryFn: () =>
      api.get<{ success?: boolean; data?: NegListRow[] }>("/api/v1/negotiation?page=1&limit=100"),
  });

  const rows = listQuery.data?.data ?? [];
  const ids = rows.map((r) => r.id);

  const detailQueries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["offers", "negotiation-detail", id],
      queryFn: () => api.get<{ success?: boolean; data?: NegDetail }>(`/api/v1/negotiation/${id}`),
      enabled: ids.length > 0,
    })),
  });

  const offers = rows.map((row, i) => {
    const raw = detailQueries[i]?.data as { success?: boolean; data?: NegDetail } | undefined;
    return mergeOffer(row, raw?.data);
  });

  const sent = offers.filter((o) => o.status === "SENT" || o.status === "DELIVERED").length;
  const paid = offers.filter((o) => o.status === "PAID").length;

  const loadingDetails = detailQueries.some((q) => q.isLoading);
  const err = listQuery.error instanceof Error ? listQuery.error.message : null;

  return (
    <PageWrapper title="Oferte" actions={<EtapaBadge label="Etapa 3" />}>
      {err ? (
        <p className="text-sm text-er mb-4" role="alert">
          {err}
        </p>
      ) : null}
      {listQuery.isLoading || loadingDetails ? (
        <p className="text-sm text-t3 mb-4">Se încarcă ofertele din negocieri…</p>
      ) : null}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard
          label="Total Oferte"
          value={String(offers.length)}
          icon="FileText"
          color="var(--color-b5)"
        />
        <KpiCard label="Trimise" value={String(sent)} icon="Send" color="var(--color-in)" />
        <KpiCard label="Plătite" value={String(paid)} icon="CheckCircle" color="var(--color-ok)" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista Oferte</CardTitle>
        </CardHeader>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-s700">
                <th className="px-4 py-3 text-left font-medium text-t3">ID</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Client</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Valoare</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Status</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Data</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {!listQuery.isLoading && !loadingDetails && offers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-t3 text-sm">
                    Nu există negocieri — nu se pot afișa oferte.
                  </td>
                </tr>
              ) : null}
              {offers.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-s800 hover:bg-s800/50 cursor-pointer"
                  onClick={() => setSelectedOffer(o)}
                >
                  <td className="px-4 py-3 text-t2 font-mono text-xs">{o.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Building2 size={12} color="var(--color-t3)" />
                      <span className="text-t1 font-medium">{o.company}</span>
                    </div>
                  </td>
                  <td
                    className="py-3 px-4 font-mono font-semibold"
                    style={{ color: "var(--color-b5)" }}
                  >
                    {o.amount}
                  </td>
                  <td className="py-3 px-4">
                    <SBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-t3">
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={11} />
                      {o.date}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="flex gap-1" aria-label="Acțiuni ofertă">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Descarcă PDF"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.info("PDF: necesită endpoint export Oblio.");
                        }}
                      >
                        <FileText size={15} />
                      </Button>
                      {o.status !== "PAID" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Trimite oferta"
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.info("Trimitere: necesită integrare canal configurată.");
                          }}
                        >
                          <Send size={15} />
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

      {selectedOffer && (
        <OfferDetailDrawer offer={selectedOffer} onClose={() => setSelectedOffer(null)} />
      )}
    </PageWrapper>
  );
}
