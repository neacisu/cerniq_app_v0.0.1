import { useState } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { EtapaBanner, EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/index.js";
import { Button } from "@/components/ui/button.js";
import { cn } from "@/lib/utils.js";
import { X, MapPin, Users, TrendingUp, Package, PhoneCall } from "lucide-react";

interface RegionData {
  id: string;
  label: string;
  county: string;
  value: number;
  revenue: string;
  revenueNum: number;
  density: 1 | 2 | 3 | 4 | 5;
  x: number;
  y: number;
  r: number;
  topClients: Array<{ name: string; revenue: string; status: "LOYAL" | "AT_RISK" }>;
  potential: string;
  salesRep: string;
  salesRepPhone: string;
}

const regions: RegionData[] = [
  {
    id: "r1",
    label: "Timiș",
    county: "Timiș",
    value: 342,
    revenue: "EUR 289K",
    revenueNum: 289000,
    density: 5,
    x: 20,
    y: 35,
    r: 28,
    topClients: [
      { name: "Ferma Banat SRL", revenue: "EUR 124K", status: "LOYAL" },
      { name: "Coop Agro Vest", revenue: "EUR 87K", status: "LOYAL" },
      { name: "SC Cereale SA", revenue: "EUR 45K", status: "AT_RISK" },
    ],
    potential: "Expansiune spre Arad și Caraș-Severin estimată +40%",
    salesRep: "Mihai Ionescu",
    salesRepPhone: "0721 100 200",
  },
  {
    id: "r2",
    label: "Cluj",
    county: "Cluj",
    value: 298,
    revenue: "EUR 241K",
    revenueNum: 241000,
    density: 4,
    x: 45,
    y: 25,
    r: 26,
    topClients: [
      { name: "Agro Transilvania SRL", revenue: "EUR 98K", status: "LOYAL" },
      { name: "OUAI Cluj Nord", revenue: "EUR 72K", status: "LOYAL" },
    ],
    potential: "Penetrare OUAI-uri din Bihor neacoperite",
    salesRep: "Ana Popa",
    salesRepPhone: "0732 300 400",
  },
  {
    id: "r3",
    label: "Iași",
    county: "Iași",
    value: 256,
    revenue: "EUR 198K",
    revenueNum: 198000,
    density: 3,
    x: 72,
    y: 30,
    r: 22,
    topClients: [
      { name: "Cooperativa Agriland", revenue: "EUR 84K", status: "AT_RISK" },
      { name: "Ferma Moldova Est", revenue: "EUR 56K", status: "LOYAL" },
    ],
    potential: "Risc churn Cooperativa Agriland — intervenție urgentă",
    salesRep: "Vasile Dumitrescu",
    salesRepPhone: "0744 500 600",
  },
  {
    id: "r4",
    label: "Constanța",
    county: "Constanța",
    value: 234,
    revenue: "EUR 187K",
    revenueNum: 187000,
    density: 2,
    x: 75,
    y: 65,
    r: 20,
    topClients: [
      { name: "OUAI Ialomița Nord", revenue: "EUR 82K", status: "LOYAL" },
      { name: "SC Cerealelor SA", revenue: "EUR 58K", status: "LOYAL" },
    ],
    potential: "Potențial mare OUAI Dobrogea — neabordat",
    salesRep: "Elena Florescu",
    salesRepPhone: "0756 700 800",
  },
  {
    id: "r5",
    label: "Dolj",
    county: "Dolj",
    value: 145,
    revenue: "EUR 112K",
    revenueNum: 112000,
    density: 1,
    x: 32,
    y: 72,
    r: 16,
    topClients: [{ name: "Agrosud Oltenia SRL", revenue: "EUR 67K", status: "LOYAL" }],
    potential: "Piață insuficient explorată — oportunitate 2026",
    salesRep: "Ion Stoica",
    salesRepPhone: "0721 900 100",
  },
];

const densityColors = {
  5: "var(--color-b5)",
  4: "oklch(0.45 0.15 220)",
  3: "oklch(0.45 0.12 200)",
  2: "oklch(0.45 0.10 190)",
  1: "oklch(0.38 0.08 220)",
};

const maxValue = Math.max(...regions.map((r) => r.value), 1);

function RegionDetailPanel({
  region,
  onClose,
}: {
  readonly region: RegionData;
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
      <div style={{ flex: 1, background: "rgba(0,0,0,0.4)" }} onClick={onClose} aria-hidden />
      <div
        style={{
          width: 380,
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={16} color="var(--color-b5)" />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-t1)" }}>
                Județul {region.label}
              </div>
              <div style={{ fontSize: 10, color: "var(--color-t3)" }}>PostGIS Cluster</div>
            </div>
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div
            style={{
              padding: "10px 12px",
              background: "var(--color-s800)",
              borderRadius: 6,
              fontSize: 11,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
              <Users size={11} color="var(--color-b5)" />
              <span style={{ color: "var(--color-t4)", fontSize: 9 }}>CLIENȚI ACTIVI</span>
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "var(--color-b5)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {region.value}
            </div>
          </div>
          <div
            style={{
              padding: "10px 12px",
              background: "var(--color-s800)",
              borderRadius: 6,
              fontSize: 11,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
              <TrendingUp size={11} color="var(--color-ok)" />
              <span style={{ color: "var(--color-t4)", fontSize: 9 }}>VENIT TOTAL</span>
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "var(--color-ok)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {region.revenue}
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-t3)", marginBottom: 8 }}>
            TOP CLIENȚI
          </div>
          {region.topClients.map((c) => (
            <div
              key={c.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 0",
                borderBottom: "1px solid var(--color-s800)",
                fontSize: 11,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: c.status === "LOYAL" ? "var(--color-ok)" : "var(--color-wa)",
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: "var(--color-t1)" }}>{c.name}</span>
              </div>
              <span
                style={{ color: "var(--color-b5)", fontFamily: "var(--font-mono)", fontSize: 10 }}
              >
                {c.revenue}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            padding: "10px 12px",
            background: "color-mix(in oklch, var(--color-neuron-environment) 10%, transparent)",
            border:
              "1px solid color-mix(in oklch, var(--color-neuron-environment) 30%, transparent)",
            borderRadius: 6,
            fontSize: 11,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
            <Package size={11} color="var(--color-neuron-environment)" />
            <span style={{ color: "var(--color-neuron-environment)", fontWeight: 600 }}>
              POTENȚIAL NEEXPLORAT
            </span>
          </div>
          <div style={{ color: "var(--color-t2)", lineHeight: 1.5 }}>{region.potential}</div>
        </div>

        <div
          style={{
            padding: "10px 12px",
            background: "var(--color-s800)",
            borderRadius: 6,
            fontSize: 11,
          }}
        >
          <div style={{ fontSize: 9, color: "var(--color-t4)", marginBottom: 4 }}>
            MANAGER REGIONAL
          </div>
          <div style={{ color: "var(--color-t1)", fontWeight: 600, marginBottom: 4 }}>
            {region.salesRep}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--color-b5)" }}>
            <PhoneCall size={10} />
            {region.salesRepPhone}
          </div>
        </div>

        <Button
          size="sm"
          style={{ gap: 5 }}
          onClick={() => {
            toast.success(`Campanie pentru județul ${region.label} creată.`);
            onClose();
          }}
        >
          <TrendingUp size={12} /> Lansează Campanie
        </Button>
      </div>
    </div>
  );
}

export function GeoMap() {
  const [selectedRegion, setSelectedRegion] = useState<RegionData | null>(null);

  const totalClients = regions.reduce((s, r) => s + r.value, 0);
  const totalRevenue = `EUR ${Math.round(regions.reduce((s, r) => s + r.revenueNum, 0) / 1000)}K`;

  return (
    <PageWrapper title="Geographic Map — PostGIS" actions={<EtapaBadge label="Etapa 5" />}>
      <EtapaBanner
        title="PostGIS Geographic Distribution"
        description="Click pe regiuni pentru detalii clienți și potențial neexplorat"
        type="ok"
        className="mb-6"
      />

      <div
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}
        className="max-[1100px]:!grid-cols-1"
      >
        <Card>
          <CardHeader>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <CardTitle>Hartă Distribuție Clienți</CardTitle>
              <div style={{ fontSize: 11, color: "var(--color-t3)" }}>
                {totalClients} clienți · {totalRevenue}
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div
              style={{
                position: "relative",
                height: 320,
                background: "var(--color-s800)",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              {/* Romania outline suggestion */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0.04,
                  background: "linear-gradient(135deg, var(--color-b5), transparent)",
                }}
              />

              {regions.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRegion(r)}
                  title={`${r.label}: ${r.value} clienți`}
                  style={{
                    position: "absolute",
                    left: `${r.x}%`,
                    top: `${r.y}%`,
                    width: r.r,
                    height: r.r,
                    transform: "translate(-50%, -50%)",
                    borderRadius: "50%",
                    background: `color-mix(in oklch, ${densityColors[r.density]} 55%, transparent)`,
                    border: `2px solid ${densityColors[r.density]}`,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "transform 0.15s, box-shadow 0.15s",
                    boxShadow: `0 0 ${r.r}px color-mix(in oklch, ${densityColors[r.density]} 30%, transparent)`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform =
                      "translate(-50%, -50%) scale(1.15)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform =
                      "translate(-50%, -50%) scale(1)";
                  }}
                >
                  <span
                    style={{
                      fontSize: r.r > 22 ? 9 : 7,
                      fontWeight: 700,
                      color: "var(--color-s900)",
                      textAlign: "center",
                      lineHeight: 1,
                    }}
                  >
                    {r.label}
                  </span>
                </button>
              ))}

              {/* Legend */}
              <div
                style={{
                  position: "absolute",
                  bottom: 10,
                  left: 10,
                  display: "flex",
                  gap: 10,
                  fontSize: 9,
                  color: "var(--color-t4)",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: densityColors[5],
                    }}
                  />{" "}
                  Densitate mare
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: densityColors[1],
                    }}
                  />{" "}
                  Densitate mică
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card>
            <CardHeader>
              <CardTitle>Top Județe</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {[...regions]
                  .sort((a, b) => b.value - a.value)
                  .map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRegion(r)}
                      className={cn(
                        "flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity",
                      )}
                    >
                      <span
                        style={{ fontSize: 11, color: "var(--color-t2)", width: 64, flexShrink: 0 }}
                      >
                        {r.label}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          background: "var(--color-s700)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 3,
                            width: `${(r.value / maxValue) * 100}%`,
                            background: densityColors[r.density],
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--color-t2)",
                          minWidth: 32,
                          textAlign: "right",
                        }}
                      >
                        {r.value}
                      </span>
                    </button>
                  ))}
              </div>
            </CardBody>
          </Card>

          <div
            style={{
              padding: "12px 14px",
              border: "2px dashed var(--color-s600)",
              borderRadius: 8,
              fontSize: 11,
              color: "var(--color-t3)",
              lineHeight: 1.5,
            }}
          >
            <div
              style={{ fontWeight: 600, color: "var(--color-neuron-environment)", marginBottom: 4 }}
            >
              🌾 Potențial neexplorat
            </div>
            Județe fără acoperire Cerniq: Bihor, Satu Mare, Maramureș, Brăila. Estimare adresabilă:
            +800 clienți noi.
          </div>
        </div>
      </div>

      {selectedRegion && (
        <RegionDetailPanel region={selectedRegion} onClose={() => setSelectedRegion(null)} />
      )}
    </PageWrapper>
  );
}
