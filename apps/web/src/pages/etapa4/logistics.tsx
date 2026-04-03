import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { SBadge } from "@/components/ui/badge.js";
import { Badge, Button } from "@/components/ui/index.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { X, Package, MapPin, Phone, Printer, XCircle } from "lucide-react";

type AwbStatus = "PROCESSING" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "RETURNED";

interface TrackingStep {
  time: string;
  location: string;
  event: string;
  done: boolean;
}

interface Awb {
  awb: string;
  company: string;
  cui: string;
  parcels: number;
  county: string;
  eta: string;
  cod: string;
  codNum: number;
  status: AwbStatus;
  weight: string;
  contactName: string;
  contactPhone: string;
  address: string;
  tracking: TrackingStep[];
}

const MOCK_AWBS: Awb[] = [
  {
    awb: "SDY-123456789",
    company: "SC AgroSud SRL",
    cui: "12345678",
    parcels: 2,
    county: "București",
    eta: "2026-04-04",
    cod: "RON 450",
    codNum: 450,
    status: "IN_TRANSIT",
    weight: "42 kg",
    contactName: "Ion Andrei",
    contactPhone: "0721 123 456",
    address: "Str. Agricultura 12, Sector 3, București",
    tracking: [
      {
        time: "2026-04-02 08:00",
        location: "Depozit Cerniq — Ilfov",
        event: "Colet preluat și AWB generat",
        done: true,
      },
      {
        time: "2026-04-02 14:30",
        location: "Hub Sameday — Pipera",
        event: "Sortat și expediat spre destinație",
        done: true,
      },
      {
        time: "2026-04-03 09:00",
        location: "Hub Sameday — București Sud",
        event: "În tranzit spre livrare",
        done: true,
      },
      {
        time: "2026-04-04",
        location: "Sector 3, București",
        event: "Livrare programată",
        done: false,
      },
    ],
  },
  {
    awb: "SDY-987654321",
    company: "Cooperativa Agriland",
    cui: "87654321",
    parcels: 1,
    county: "Iași",
    eta: "2026-04-05",
    cod: "-",
    codNum: 0,
    status: "PROCESSING",
    weight: "18 kg",
    contactName: "Maria Ionescu",
    contactPhone: "0732 987 654",
    address: "Calea Chișinăului 45, Iași",
    tracking: [
      {
        time: "2026-04-03 07:00",
        location: "Depozit Cerniq — Ilfov",
        event: "Colet în pregătire",
        done: true,
      },
      {
        time: "2026-04-03 15:00",
        location: "Hub Sameday — Pipera",
        event: "Sortat pentru expediție",
        done: false,
      },
      {
        time: "2026-04-04",
        location: "Hub Sameday — Moldova",
        event: "Tranzit spre Iași",
        done: false,
      },
      { time: "2026-04-05", location: "Iași", event: "Livrare programată", done: false },
    ],
  },
  {
    awb: "SDY-555666777",
    company: "OUAI Ialomița Nord",
    cui: "11223344",
    parcels: 3,
    county: "Constanța",
    eta: "2026-04-04",
    cod: "RON 890",
    codNum: 890,
    status: "OUT_FOR_DELIVERY",
    weight: "85 kg",
    contactName: "Vasile Dumitru",
    contactPhone: "0744 555 777",
    address: "Str. Portului 3, Constanța",
    tracking: [
      {
        time: "2026-04-01 06:00",
        location: "Depozit Cerniq — Ilfov",
        event: "Colet preluat",
        done: true,
      },
      {
        time: "2026-04-01 18:00",
        location: "Hub Sameday — Constanța",
        event: "Ajuns la hub destinație",
        done: true,
      },
      {
        time: "2026-04-04 07:30",
        location: "Constanța",
        event: "Plecat la livrare — curier Mihai P.",
        done: true,
      },
      { time: "2026-04-04", location: "Str. Portului 3", event: "Livrat", done: false },
    ],
  },
];

/** Ordinea afișării în tabel: de la „în pregătire” spre „livrat / returnat” (flux operațional). */
const AWB_STATUS_SORT_ORDER: readonly AwbStatus[] = [
  "PROCESSING",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "RETURNED",
] as const;

function awbStatusSortIndex(status: AwbStatus): number {
  const i = AWB_STATUS_SORT_ORDER.indexOf(status);
  return i === -1 ? AWB_STATUS_SORT_ORDER.length : i;
}

function AwbDrawer({ awb, onClose }: { readonly awb: Awb; readonly onClose: () => void }) {
  function handlePrint() {
    toast.success(`AWB ${awb.awb} trimis la imprimantă.`);
  }
  function handleCancel() {
    toast.error(`AWB ${awb.awb} anulat. Stoc reintegrat în depozit.`);
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
          width: 420,
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
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--color-b5)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {awb.awb}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-t3)" }}>{awb.company}</div>
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
          <SBadge status={awb.status} />
          <span style={{ fontSize: 10, color: "var(--color-t3)" }}>
            ETA: <strong style={{ color: "var(--color-t2)" }}>{awb.eta}</strong>
          </span>
          {awb.codNum > 0 && (
            <Badge variant="warning" className="text-[0.6rem]">
              COD {awb.cod}
            </Badge>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 11 }}>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>COLETE</div>
            <div
              style={{ color: "var(--color-t1)", display: "flex", alignItems: "center", gap: 4 }}
            >
              <Package size={11} color="var(--color-t3)" /> {awb.parcels} buc × {awb.weight}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>CONTACT</div>
            <div style={{ color: "var(--color-t2)" }}>{awb.contactName}</div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>TELEFON</div>
            <div
              style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--color-b5)" }}
            >
              <Phone size={10} /> {awb.contactPhone}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>JUDEȚ</div>
            <div
              style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--color-t2)" }}
            >
              <MapPin size={10} color="var(--color-t3)" /> {awb.county}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "6px 10px",
            background: "var(--color-s800)",
            borderRadius: 4,
            fontSize: 10,
            color: "var(--color-t3)",
          }}
        >
          📍 {awb.address}
        </div>

        {/* Tracking timeline */}
        <div>
          <div
            style={{ fontSize: 11, fontWeight: 600, color: "var(--color-t3)", marginBottom: 10 }}
          >
            TRACKING TIMELINE
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {awb.tracking.map((step, i) => (
              <div
                key={step.time}
                style={{
                  display: "flex",
                  gap: 12,
                  paddingBottom: i < awb.tracking.length - 1 ? 12 : 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: 20,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      border: `2px solid ${step.done ? "var(--color-ok)" : "var(--color-s600)"}`,
                      background: step.done ? "var(--color-ok)" : "var(--color-s800)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {step.done && (
                      <div
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "var(--color-s900)",
                        }}
                      />
                    )}
                  </div>
                  {i < awb.tracking.length - 1 && (
                    <div
                      style={{
                        width: 2,
                        flex: 1,
                        background: step.done ? "var(--color-ok)" : "var(--color-s700)",
                        marginTop: 2,
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, paddingTop: 0 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: step.done ? 600 : 400,
                      color: step.done ? "var(--color-t1)" : "var(--color-t4)",
                    }}
                  >
                    {step.event}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--color-t4)", marginTop: 1 }}>
                    {step.location} · {step.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
          <Button size="sm" variant="outline" style={{ flex: 1, gap: 5 }} onClick={handlePrint}>
            <Printer size={12} /> Print AWB
          </Button>
          {awb.status !== "DELIVERED" && (
            <Button
              size="sm"
              variant="outline"
              style={{ flex: 1, gap: 5, color: "var(--color-er)", borderColor: "var(--color-er)" }}
              onClick={handleCancel}
            >
              <XCircle size={12} /> Anulează
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Logistics() {
  const [selected, setSelected] = useState<Awb | null>(null);

  const awbsForTable = useMemo(
    () =>
      [...MOCK_AWBS].sort((a, b) => awbStatusSortIndex(a.status) - awbStatusSortIndex(b.status)),
    [],
  );

  const inTransit = MOCK_AWBS.filter(
    (a) => a.status === "IN_TRANSIT" || a.status === "OUT_FOR_DELIVERY",
  ).length;
  const codTotal = MOCK_AWBS.reduce((s, a) => s + a.codNum, 0);

  return (
    <PageWrapper title="Logistics AWB (Sameday)" actions={<EtapaBadge label="Etapa 4" />}>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard
          label="AWBuri Active"
          value={String(MOCK_AWBS.length)}
          icon="Package"
          color="var(--color-b5)"
        />
        <KpiCard
          label="În Tranzit"
          value={String(inTransit)}
          icon="Truck"
          color="var(--color-in)"
        />
        <KpiCard
          label="COD Pending"
          value={`RON ${codTotal.toLocaleString()}`}
          icon="Wallet"
          color="var(--color-wa)"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AWBuri Active — Click pentru tracking</CardTitle>
        </CardHeader>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-s700">
                <th className="text-left py-3 px-4 text-t3 font-medium">AWB Nr</th>
                <th className="text-left py-3 px-4 text-t3 font-medium">Client</th>
                <th className="text-left py-3 px-4 text-t3 font-medium">Colete</th>
                <th className="text-left py-3 px-4 text-t3 font-medium">Județ</th>
                <th className="text-left py-3 px-4 text-t3 font-medium">ETA</th>
                <th className="text-left py-3 px-4 text-t3 font-medium">COD</th>
                <th className="text-left py-3 px-4 text-t3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {awbsForTable.map((a) => (
                <tr
                  key={a.awb}
                  onClick={() => setSelected(a)}
                  className="border-b border-s800 hover:bg-s800/50 cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <span className="text-b5 hover:underline font-mono text-xs font-semibold">
                      {a.awb}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-t1 font-medium">{a.company}</td>
                  <td className="py-3 px-4 text-t2">{a.parcels}</td>
                  <td className="py-3 px-4 text-t2">
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={10} color="var(--color-t4)" /> {a.county}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-t3">{a.eta}</td>
                  <td className="py-3 px-4">
                    <Badge variant={a.codNum > 0 ? "warning" : "neutral"}>
                      {a.codNum > 0 ? a.cod : "—"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <SBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {selected && <AwbDrawer awb={selected} onClose={() => setSelected(null)} />}
    </PageWrapper>
  );
}
