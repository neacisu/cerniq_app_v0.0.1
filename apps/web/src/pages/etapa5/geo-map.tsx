import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { EtapaBanner, EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/index.js";
import { Button } from "@/components/ui/button.js";
import { cn } from "@/lib/utils.js";
import { X, MapPin, Users, TrendingUp, Package, PhoneCall } from "lucide-react";
import { fetchGraphGeoSummary, type GeoSummaryRow } from "@/lib/etapa5-api.js";

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
}

const densityColors = {
  5: "var(--color-b5)",
  4: "oklch(0.45 0.15 220)",
  3: "oklch(0.45 0.12 200)",
  2: "oklch(0.45 0.10 190)",
  1: "oklch(0.38 0.08 220)",
};

function buildRegionsFromApi(rows: GeoSummaryRow[]): RegionData[] {
  if (rows.length === 0) return [];
  const counts = rows.map((x) => x.companyCount).sort((a, b) => a - b);
  const p = (q: number) =>
    counts[Math.min(counts.length - 1, Math.floor((q / 100) * counts.length))];

  const sorted = [...rows].sort((a, b) => b.companyCount - a.companyCount);
  const n = sorted.length;
  const cols = Math.ceil(Math.sqrt(n));
  const maxC = Math.max(...sorted.map((r) => r.companyCount), 1);

  return sorted.map((row, i) => {
    const col = i % cols;
    const rowIdx = Math.floor(i / cols);
    const x = ((col + 0.5) / cols) * 85 + 8;
    const y = ((rowIdx + 0.5) / Math.ceil(n / cols)) * 75 + 10;
    const r = 14 + Math.round((row.companyCount / maxC) * 22);
    const rev = Number(row.revenueSum) || 0;
    let density: 1 | 2 | 3 | 4 | 5 = 1;
    if (row.companyCount >= p(80)) density = 5;
    else if (row.companyCount >= p(60)) density = 4;
    else if (row.companyCount >= p(40)) density = 3;
    else if (row.companyCount >= p(20)) density = 2;

    return {
      id: row.regionLabel,
      label: row.regionLabel,
      county: row.regionLabel,
      value: row.companyCount,
      revenue: `RON ${Math.round(rev).toLocaleString("ro-RO")}`,
      revenueNum: rev,
      density,
      x,
      y,
      r,
    };
  });
}

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
                Regiune: {region.label}
              </div>
              <div style={{ fontSize: 10, color: "var(--color-t3)" }}>
                Agregare GET /api/v1/graph/geo-summary
              </div>
            </div>
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
              <span style={{ color: "var(--color-t4)", fontSize: 9 }}>COMPANII</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-t1)" }}>
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
              <span style={{ color: "var(--color-t4)", fontSize: 9 }}>CIFRĂ AFACERI (SUMĂ)</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ok)" }}>
              {region.revenue}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "10px 12px",
            background: "var(--color-s800)",
            borderRadius: 6,
            fontSize: 11,
            color: "var(--color-t3)",
          }}
        >
          <Package size={11} style={{ display: "inline", marginRight: 6 }} />
          Top clienți per județ nu sunt incluși în geo-summary — folosiți filtre Gold / rapoarte
          dedicate.
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
            MANAGER / CONTACT
          </div>
          <div style={{ color: "var(--color-t1)", fontWeight: 600, marginBottom: 4 }}>—</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--color-b5)" }}>
            <PhoneCall size={10} />
            Date de contact regionale nu sunt în agregare.
          </div>
        </div>

        <Button
          size="sm"
          style={{ gap: 5 }}
          onClick={() => {
            toast.message(
              "Campaniile outbound se lansează prin fluxul E2/E5 — nu este un POST în geo-summary.",
            );
            onClose();
          }}
        >
          <TrendingUp size={12} /> Notă campanie
        </Button>
      </div>
    </div>
  );
}

export function GeoMap() {
  const [selectedRegion, setSelectedRegion] = useState<RegionData | null>(null);

  const geoQuery = useQuery({
    queryKey: ["etapa5", "graph", "geo-summary"],
    queryFn: () => fetchGraphGeoSummary(),
  });

  const regions = useMemo(
    () => buildRegionsFromApi(geoQuery.data?.data ?? []),
    [geoQuery.data?.data],
  );
  const maxValue = Math.max(...regions.map((r) => r.value), 1);

  const totalClients = regions.reduce((s, r) => s + r.value, 0);
  const totalRevenueNum = regions.reduce((s, r) => s + r.revenueNum, 0);
  const totalRevenue = `RON ${Math.round(totalRevenueNum).toLocaleString("ro-RO")}`;

  return (
    <PageWrapper title="Geographic Map — agregare Gold" actions={<EtapaBadge label="Etapa 5" />}>
      <EtapaBanner
        title="Distribuție geografică (gold_companies)"
        description="Date din GET /api/v1/graph/geo-summary — pozițiile bulelor sunt derive din grilă (nu GPS fictiv)."
        type="ok"
        className="mb-6"
      />

      {geoQuery.isError && (
        <div className="mb-4 rounded border border-er/40 bg-er/10 px-4 py-3 text-sm text-er">
          Eroare la încărcarea agregării geografice.
        </div>
      )}

      <div
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}
        className="max-[1100px]:!grid-cols-1"
      >
        <Card>
          <CardHeader>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <CardTitle>Hartă (grilă) — companii pe regiune</CardTitle>
              <div style={{ fontSize: 11, color: "var(--color-t3)" }}>
                {totalClients} companii · {totalRevenue}
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
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0.04,
                  background: "linear-gradient(135deg, var(--color-b5), transparent)",
                }}
              />

              {regions.length === 0 && geoQuery.isSuccess && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    color: "var(--color-t3)",
                  }}
                >
                  Nu există companii Gold pentru acest tenant.
                </div>
              )}

              {regions.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRegion(r)}
                  title={`${r.label}: ${r.value} companii`}
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
                    {r.label.length > 10 ? `${r.label.slice(0, 9)}…` : r.label}
                  </span>
                </button>
              ))}

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
              <CardTitle>Top regiuni</CardTitle>
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
                        style={{ fontSize: 11, color: "var(--color-t2)", width: 96, flexShrink: 0 }}
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
              Acoperire
            </div>
            Județele fără companii Gold nu apar în listă. Completați datele în E1 sau importuri
            pentru acoperire reală.
          </div>
        </div>
      </div>

      {selectedRegion && (
        <RegionDetailPanel region={selectedRegion} onClose={() => setSelectedRegion(null)} />
      )}
    </PageWrapper>
  );
}
