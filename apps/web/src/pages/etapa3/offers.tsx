import { useState } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
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

const MOCK_OFFERS: Offer[] = [
  {
    id: "OF-001",
    company: "SC AgroSud SRL",
    cui: "12345678",
    amount: "RON 23.400",
    amountNum: 23400,
    status: "SENT",
    date: "2026-04-01",
    validUntil: "2026-05-01",
    products: ["Semințe Grâu PREMIUM Sorin F1 × 40", "Îngrășământ NPK 15-15-15 × 20"],
  },
  {
    id: "OF-002",
    company: "Cooperativa Agriland",
    cui: "87654321",
    amount: "RON 12.000",
    amountNum: 12000,
    status: "DRAFT",
    date: "2026-04-02",
    validUntil: "2026-05-02",
    products: ["Semințe Floarea-Soarelui HiSun X12 × 30"],
  },
  {
    id: "OF-003",
    company: "OUAI Ialomița Nord",
    cui: "11223344",
    amount: "RON 8.200",
    amountNum: 8200,
    status: "DELIVERED",
    date: "2026-03-30",
    validUntil: "2026-04-30",
    products: ["Fungicid Topsin M 70 WP × 10", "Uree Granulată 46% × 50"],
  },
  {
    id: "OF-004",
    company: "SC Ferma Dunărea SA",
    cui: "99887766",
    amount: "RON 45.000",
    amountNum: 45000,
    status: "PAID",
    date: "2026-03-25",
    validUntil: "2026-04-25",
    products: ["Semințe Porumb Daciana 350 FAO × 80", "Îngrășământ NPK × 100"],
  },
  {
    id: "OF-005",
    company: "Agro Nord Impex SRL",
    cui: "55667788",
    amount: "RON 16.800",
    amountNum: 16800,
    status: "SENT",
    date: "2026-04-02",
    validUntil: "2026-05-02",
    products: ["Semințe Grâu PREMIUM Sorin F1 × 60"],
  },
];

function OfferDetailDrawer({
  offer,
  onClose,
}: {
  readonly offer: Offer;
  readonly onClose: () => void;
}) {
  function handleDownload() {
    toast.success(`PDF ofertă ${offer.id} — descărcare simulată.`);
  }
  function handleSend() {
    toast.success(`Oferta ${offer.id} trimisă via e-mail către ${offer.company}.`);
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
              {offer.id}
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

  const sent = MOCK_OFFERS.filter((o) => o.status === "SENT" || o.status === "DELIVERED").length;
  const paid = MOCK_OFFERS.filter((o) => o.status === "PAID").length;

  return (
    <PageWrapper title="Oferte" actions={<EtapaBadge label="Etapa 3" />}>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard
          label="Total Oferte"
          value={String(MOCK_OFFERS.length)}
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
              {MOCK_OFFERS.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-s800 hover:bg-s800/50 cursor-pointer"
                  onClick={() => setSelectedOffer(o)}
                >
                  <td className="px-4 py-3 text-t2 font-mono text-xs">{o.id}</td>
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
                          toast.success(`PDF ${o.id} — descărcare simulată.`);
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
                            toast.success(`Oferta ${o.id} trimisă către ${o.company}.`);
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
