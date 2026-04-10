import type { ReactNode } from "react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { StatsGrid } from "@/components/widgets/StatsGrid.js";
import { BarTrendChart } from "@/components/charts/BarTrendChart.js";
import { GaugeChart } from "@/components/charts/GaugeChart.js";
import { usePostsaleActivityFeed, usePostsaleDashboard } from "@/hooks/use-etapa4.js";
import { PaymentActivityFeed } from "@/components/etapa4/PaymentActivityFeed.js";

function countOrderStatus(
  rows: Array<{ status: string; count: number }> | undefined,
  statuses: readonly string[],
): number {
  if (rows === undefined) return 0;
  return rows.filter((r) => statuses.includes(r.status)).reduce((s, r) => s + r.count, 0);
}

function parseCreditScoreAvg(raw: string | number | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

type BarPoint = { label: string; value: number };

function PaymentVolumeSection({
  awaitingData,
  bars,
}: Readonly<{ awaitingData: boolean; bars: BarPoint[] }>) {
  if (awaitingData) {
    return <p className="text-sm text-t3 py-8">Se încarcă…</p>;
  }
  return <BarTrendChart data={bars} />;
}

function CreditDistributionSection({
  awaitingData,
  bars,
}: Readonly<{ awaitingData: boolean; bars: BarPoint[] }>) {
  if (awaitingData) {
    return <p className="text-sm text-t3 py-8">Se încarcă…</p>;
  }
  if (bars.length === 0) {
    return <p className="text-sm text-t3">Nu există profile credit sau date insuficiente.</p>;
  }
  return <BarTrendChart data={bars} />;
}

export function DashboardE4() {
  const navigate = useNavigate();
  const dash = usePostsaleDashboard();
  const activity = usePostsaleActivityFeed();

  const kpis = useMemo(() => {
    const pay = dash.data?.paySum.data;
    const ord = dash.data?.orders.data;
    const ship = dash.data?.ship.data;
    const cr = dash.data?.credit.data;

    const pendingCredits = countOrderStatus(ord?.byStatus, ["CREDIT_PENDING"]);
    const activeDeliveries = countOrderStatus(ship?.byStatus, [
      "CREATED",
      "PICKED_UP",
      "IN_TRANSIT",
      "OUT_FOR_DELIVERY",
    ]);
    const openReturns = countOrderStatus(ord?.byStatus, ["RETURNED", "RETURN_PROCESSING"]);

    return {
      paymentsToday: pay?.todayPaymentsCount ?? 0,
      paymentsTodayLabel: pay?.todayPaymentsTotal
        ? Number(pay.todayPaymentsTotal).toLocaleString("ro-RO", { maximumFractionDigits: 0 })
        : "0",
      pendingCredits,
      activeDeliveries,
      openReturns,
      creditAvg: parseCreditScoreAvg(cr?.scoreStats?.avg),
    };
  }, [dash.data]);

  const paymentBars = useMemo(() => {
    const vol = dash.data?.paySum.data?.dailyVolume ?? [];
    return vol.map((d) => ({
      label: d.day
        ? new Date(`${d.day}T12:00:00Z`).toLocaleDateString("ro-RO", {
            day: "2-digit",
            month: "short",
          })
        : "—",
      value: Math.round(Number(d.totalAmount)),
    }));
  }, [dash.data]);

  const creditHist = useMemo(() => {
    const byRisk = dash.data?.credit.data?.byRisk ?? [];
    return byRisk.map((r) => ({
      label: r.riskTier,
      value: r.count,
    }));
  }, [dash.data]);

  const err = dash.error instanceof Error ? dash.error.message : null;
  const awaitingFirstPayload = dash.isLoading === true && dash.data === undefined;
  const gaugeBlock: ReactNode =
    kpis.creditAvg === null ? null : (
      <div className="flex flex-col items-center gap-2 shrink-0">
        <span className="text-xs text-t4 uppercase tracking-wide">Scor mediu</span>
        <GaugeChart value={kpis.creditAvg} />
        <span className="font-mono text-lg text-b5">{kpis.creditAvg.toFixed(1)}</span>
      </div>
    );

  return (
    <PageWrapper
      title="Dashboard Post-vânzare (E4)"
      subtitle="Actualizare la ~10s (polling). Plăți, credit, livrări și retururi — fără WebSocket."
      actions={<EtapaBadge label="Etapa 4" />}
    >
      {err ? (
        <p className="text-sm text-er mb-4" role="alert">
          {err}
        </p>
      ) : null}

      <div className="mb-6">
        <StatsGrid
          onNavigate={(path) => navigate(path)}
          items={[
            {
              label: "Plăți astăzi (număr)",
              value: dash.isLoading ? "…" : String(kpis.paymentsToday),
              icon: "CreditCard",
              color: "var(--color-b5)",
              path: "/payments",
            },
            {
              label: "Credit în așteptare",
              value: dash.isLoading ? "…" : String(kpis.pendingCredits),
              icon: "Clock",
              color: "var(--color-wa)",
              path: "/orders/board",
            },
            {
              label: "Livrări active",
              value: dash.isLoading ? "…" : String(kpis.activeDeliveries),
              icon: "Truck",
              color: "var(--color-in)",
              path: "/logistics",
            },
            {
              label: "Retururi deschise",
              value: dash.isLoading ? "…" : String(kpis.openReturns),
              icon: "PackageX",
              color: "var(--color-er)",
              path: "/returns",
            },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-t2 mb-3">Volum plăți (30 zile, RON)</h3>
          <PaymentVolumeSection awaitingData={awaitingFirstPayload} bars={paymentBars} />
        </div>
        <div className="card p-4 flex flex-col sm:flex-row gap-6 items-center">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-t2 mb-3">
              Distribuție risc credit (profile)
            </h3>
            <CreditDistributionSection awaitingData={awaitingFirstPayload} bars={creditHist} />
          </div>
          {gaugeBlock}
        </div>
      </div>

      <PaymentActivityFeed items={activity.data ?? []} isLoading={activity.isLoading} />
    </PageWrapper>
  );
}
