import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { SBadge } from "@/components/ui/badge.js";
import { Badge, Button } from "@/components/ui/index.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { EmptyState } from "@/components/feedback/EmptyState.js";
import { X, Package, MapPin, Phone, Printer, XCircle } from "lucide-react";
import {
  fetchShipmentDetail,
  fetchShipmentsList,
  type ShipmentDetail,
  type ShipmentListRow,
} from "@/lib/etapa4-api.js";

function toastAwbCancelUnavailable(): void {
  toast.message("Anularea AWB nu este expusă prin API în această versiune.");
}

type AwbStatus = "PROCESSING" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "RETURNED";

interface TrackingStep {
  time: string;
  location: string;
  event: string;
  done: boolean;
}

interface Awb {
  shipmentId: string;
  awb: string;
  company: string;
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

function mapCarrierStatus(status: string): AwbStatus {
  if (status === "CREATED" || status === "PICKED_UP") return "PROCESSING";
  if (status === "IN_TRANSIT") return "IN_TRANSIT";
  if (status === "OUT_FOR_DELIVERY") return "OUT_FOR_DELIVERY";
  if (status === "DELIVERED") return "DELIVERED";
  if (status === "DELIVERY_FAILED" || status === "RETURNED") return "RETURNED";
  return "PROCESSING";
}

function listRowToAwb(r: ShipmentListRow): Awb {
  const codNum = Number(r.codAmount);
  const hasCod = r.codType !== "NONE" && codNum > 0;
  return {
    shipmentId: r.id,
    awb: r.awbNumber?.trim() ? r.awbNumber : r.id,
    company: r.companyName?.trim() ? r.companyName : "—",
    parcels: 1,
    county: "—",
    eta: r.estimatedDelivery ? r.estimatedDelivery.slice(0, 10) : "—",
    cod: hasCod ? `${r.currency} ${codNum.toLocaleString("ro-RO")}` : "—",
    codNum: hasCod ? codNum : 0,
    status: mapCarrierStatus(r.status),
    weight: "—",
    contactName: "—",
    contactPhone: "—",
    address: "—",
    tracking: [],
  };
}

function trackingFromDetail(d: ShipmentDetail | undefined): TrackingStep[] {
  const ev = d?.trackingEvents ?? [];
  if (ev.length === 0) {
    return [
      {
        time: "—",
        location: "—",
        event: "Nu există evenimente de tracking în baza de date.",
        done: false,
      },
    ];
  }
  return ev.map((e) => ({
    time: e.eventTimestamp,
    location: [e.locationCity, e.locationCounty].filter(Boolean).join(", ") || "—",
    event: e.statusText ?? e.statusCode ?? "Eveniment",
    done: true,
  }));
}

function mergeAwbWithDetail(base: Awb, d: ShipmentDetail | undefined): Awb {
  if (!d) return { ...base, tracking: trackingFromDetail(undefined) };
  const addr = d.deliveryAddress as Record<string, string | null | undefined> | null;
  const street = addr?.street;
  const city = addr?.city;
  const county = addr?.county;
  const line = [street, city, county].filter(Boolean).join(", ");
  return {
    ...base,
    county: county ?? base.county,
    contactName: addr?.contactName?.trim() ? String(addr.contactName) : base.contactName,
    contactPhone: addr?.contactPhone?.trim() ? String(addr.contactPhone) : base.contactPhone,
    address: line || base.address,
    weight: d.weight ? `${d.weight} kg` : base.weight,
    tracking: trackingFromDetail(d),
  };
}

function AwbDrawer({
  awb,
  detail,
  detailLoading,
  onClose,
}: {
  readonly awb: Awb;
  readonly detail: ShipmentDetail | undefined;
  readonly detailLoading: boolean;
  readonly onClose: () => void;
}) {
  const display = useMemo(() => mergeAwbWithDetail(awb, detail), [awb, detail]);

  function handlePrint() {
    if (detail?.labelPdfUrl) {
      globalThis.window?.open(detail.labelPdfUrl, "_blank", "noopener,noreferrer");
      return;
    }
    toast.message("PDF AWB indisponibil — nu există labelPdfUrl în răspunsul API.");
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
              {display.awb}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-t3)" }}>{display.company}</div>
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

        {detailLoading && (
          <div style={{ fontSize: 11, color: "var(--color-t3)" }}>Se încarcă detaliile…</div>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <SBadge status={display.status} />
          <span style={{ fontSize: 10, color: "var(--color-t3)" }}>
            ETA: <strong style={{ color: "var(--color-t2)" }}>{display.eta}</strong>
          </span>
          {display.codNum > 0 && (
            <Badge variant="warning" className="text-[0.6rem]">
              COD {display.cod}
            </Badge>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 11 }}>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>COLETE</div>
            <div
              style={{ color: "var(--color-t1)", display: "flex", alignItems: "center", gap: 4 }}
            >
              <Package size={11} color="var(--color-t3)" /> {display.parcels} buc · {display.weight}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>CONTACT</div>
            <div style={{ color: "var(--color-t2)" }}>{display.contactName}</div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>TELEFON</div>
            <div
              style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--color-b5)" }}
            >
              <Phone size={10} /> {display.contactPhone}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>JUDEȚ</div>
            <div
              style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--color-t2)" }}
            >
              <MapPin size={10} color="var(--color-t3)" /> {display.county}
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
          {display.address === "—"
            ? "Adresă livrare: vezi detaliu după încărcare."
            : `📍 ${display.address}`}
        </div>

        <div>
          <div
            style={{ fontSize: 11, fontWeight: 600, color: "var(--color-t3)", marginBottom: 10 }}
          >
            TRACKING TIMELINE
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {display.tracking.map((step, i) => (
              <div
                key={`${step.time}-${i}`}
                style={{
                  display: "flex",
                  gap: 12,
                  paddingBottom: i < display.tracking.length - 1 ? 12 : 0,
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
                  {i < display.tracking.length - 1 && (
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
            <Printer size={12} /> PDF / etichetă
          </Button>
          {display.status !== "DELIVERED" && (
            <Button
              size="sm"
              variant="outline"
              style={{ flex: 1, gap: 5, color: "var(--color-er)", borderColor: "var(--color-er)" }}
              onClick={toastAwbCancelUnavailable}
            >
              <XCircle size={12} /> Anulare
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Logistics() {
  const [selected, setSelected] = useState<Awb | null>(null);
  const selectedShipmentId = selected?.shipmentId ?? "";

  const listQuery = useQuery({
    queryKey: ["etapa4", "shipments", "list"],
    queryFn: () => fetchShipmentsList({ limit: 100, page: 1 }),
  });

  const detailQuery = useQuery({
    queryKey: ["etapa4", "shipments", "detail", selectedShipmentId],
    queryFn: () => fetchShipmentDetail(selectedShipmentId),
    enabled: selectedShipmentId.length > 0,
  });

  const awbsForTable = useMemo(() => {
    const rows = listQuery.data?.data ?? [];
    return [...rows.map(listRowToAwb)].sort(
      (a, b) => awbStatusSortIndex(a.status) - awbStatusSortIndex(b.status),
    );
  }, [listQuery.data?.data]);

  const inTransit = awbsForTable.filter(
    (a) => a.status === "IN_TRANSIT" || a.status === "OUT_FOR_DELIVERY",
  ).length;
  const codTotal = awbsForTable.reduce((s, a) => s + a.codNum, 0);

  return (
    <PageWrapper title="Logistics AWB (Sameday)" actions={<EtapaBadge label="Etapa 4" />}>
      {listQuery.isError && (
        <div className="mb-4 rounded border border-er/40 bg-er/10 px-4 py-3 text-sm text-er">
          Eroare la încărcarea expedierilor.
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard
          label="Expedieri"
          value={String(awbsForTable.length)}
          icon="Package"
          color="var(--color-b5)"
        />
        <KpiCard
          label="În tranzit"
          value={String(inTransit)}
          icon="Truck"
          color="var(--color-in)"
        />
        <KpiCard
          label="COD (sumă)"
          value={`RON ${codTotal.toLocaleString("ro-RO")}`}
          icon="Wallet"
          color="var(--color-wa)"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expedieri — click pentru tracking</CardTitle>
        </CardHeader>
        <CardBody className="p-0 overflow-x-auto">
          {listQuery.isSuccess && awbsForTable.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Fără expedieri"
                description="Nu există înregistrări gold_shipments."
              />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-s700">
                  <th className="text-left py-3 px-4 text-t3 font-medium">AWB / ID</th>
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
                    key={a.shipmentId}
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
          )}
        </CardBody>
      </Card>

      {selected !== null && (
        <AwbDrawer
          awb={selected}
          detail={detailQuery.data?.data}
          detailLoading={detailQuery.isFetching}
          onClose={() => setSelected(null)}
        />
      )}
    </PageWrapper>
  );
}
