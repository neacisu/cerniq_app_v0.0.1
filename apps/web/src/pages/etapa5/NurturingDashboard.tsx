/**
 * NurturingDashboard — E5 Client Lifecycle + Churn + KOL Community
 *
 * Date reale: `GET /api/v1/nurturing/states` (totaluri per `currentState`),
 * `GET /api/v1/churn/factors` (heatmap județ × risc),
 * `GET /api/v1/graph/kol-profiles` + `GET /api/v1/graph/relationships` (ReactFlow).
 */
import { useState, useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Users, TrendingDown, Network } from "lucide-react";
import {
  NURTURING_STATE_ORDER,
  fetchNurturingStates,
  fetchChurnFactorsBatched,
  fetchGraphKolProfiles,
  fetchGraphRelationships,
  type GraphKolProfileRow,
} from "@/lib/etapa5-api.js";
import { messageFromUnknown } from "@/lib/api.js";
import {
  buildChurnJudetRiskHeatmap,
  churnCountIntensityColor,
  churnCountLabel,
} from "@/lib/etapa5-churn-heatmap.js";
import { buildKolFlowGraph } from "@/lib/etapa5-kol-graph.js";

function legendFormatter(value: string) {
  return <span style={{ fontSize: 10, color: "var(--color-t2)" }}>{value}</span>;
}

const STATE_FILL: Record<string, string> = {
  ONBOARDING: "var(--color-t3)",
  NURTURING_ACTIVE: "var(--color-ok)",
  AT_RISK: "var(--color-wa)",
  CHURNED: "var(--color-er)",
  REACTIVATED: "var(--color-b5)",
  LOYAL_CLIENT: "var(--color-ok)",
  ADVOCATE: "var(--color-neuron-graph)",
};

function ChurnHeatmapFromApi({
  isLoading,
  errorMessage,
  model,
}: {
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  readonly model: ReturnType<typeof buildChurnJudetRiskHeatmap>;
}) {
  if (isLoading) {
    return <div style={{ fontSize: 12, color: "var(--color-t3)" }}>Se încarcă factorii churn…</div>;
  }
  if (errorMessage) {
    return (
      <div style={{ fontSize: 12, color: "var(--color-er)" }} role="alert">
        {errorMessage}
      </div>
    );
  }
  if (model.columnKeys.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--color-t3)" }}>
        Nu există factori churn agregați pentru tenant (sau lipsesc județe în Gold). Rulați
        pipeline-ul E5 churn sau verificați datele companii.
      </div>
    );
  }

  const { maxCell } = model;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr>
            <th
              style={{
                padding: "6px 8px",
                textAlign: "left",
                color: "var(--color-t3)",
                fontWeight: 500,
                width: 88,
              }}
            >
              Risc \ Județ
            </th>
            {model.columnKeys.map((j) => (
              <th
                key={j}
                style={{
                  padding: "6px 8px",
                  textAlign: "center",
                  color: "var(--color-t3)",
                  fontWeight: 500,
                  maxWidth: 96,
                }}
              >
                {j}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {model.rowKeys.map((risk, ri) => (
            <tr key={risk}>
              <td
                style={{
                  padding: "4px 8px",
                  color: "var(--color-t2)",
                  fontWeight: 500,
                }}
              >
                {risk}
              </td>
              {model.columnKeys.map((j, ci) => {
                const value = model.matrix[ri]?.[ci] ?? 0;
                return (
                  <td key={`${risk}-${j}`} style={{ padding: 2, textAlign: "center" }}>
                    <div
                      title={`${risk} · ${j}: ${value} înregistrări (eșantion agregat)`}
                      aria-label={`${risk} ${j} ${value} înregistrări`}
                      style={{
                        background: churnCountIntensityColor(value, maxCell),
                        borderRadius: 4,
                        padding: "6px 4px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                        fontSize: 10,
                        color: "var(--color-t1)",
                      }}
                    >
                      {value > 0 ? value : "—"}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div
        style={{
          marginTop: 8,
          display: "flex",
          gap: 8,
          fontSize: 9,
          color: "var(--color-t4)",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span>Intensitate (în eșantion):</span>
        {[0.15, 0.35, 0.55, 0.85].map((r) => {
          const v = Math.max(1, Math.round(r * maxCell));
          return (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: churnCountIntensityColor(v, maxCell),
                }}
              />
              <span>{churnCountLabel(v, maxCell)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KolNodePanel({
  profile,
  onClose,
}: {
  readonly profile: GraphKolProfileRow;
  readonly onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 10,
        width: 240,
        background: "var(--color-s900)",
        border: "1px solid var(--color-s700)",
        borderRadius: 8,
        padding: 14,
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--color-t1)",
              lineHeight: 1.3,
            }}
          >
            {profile.companyName?.trim() || "KOL"}
          </div>
          <div style={{ fontSize: 9, color: "var(--color-t3)", marginTop: 4 }}>
            CUI {profile.cui ?? "—"} · {profile.judet ?? "—"}
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
            fontSize: 14,
            lineHeight: 1,
          }}
          aria-label="Închide"
        >
          ✕
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-t4)" }}>Cluster</span>
          <span style={{ color: "var(--color-b5)", fontWeight: 600 }}>
            {profile.clusterName ?? profile.clusterId.slice(0, 8)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-t4)" }}>Membri</span>
          <span style={{ color: "var(--color-t1)", fontWeight: 600 }}>{profile.memberCount}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-t4)" }}>Modularity</span>
          <span
            style={{
              color: "var(--color-neuron-graph)",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
            }}
          >
            {Number(profile.modularityScore).toFixed(4)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-t4)" }}>Detecție</span>
          <span style={{ color: "var(--color-t2)" }}>{profile.detectionMethod}</span>
        </div>
      </div>
    </div>
  );
}

function CustomPieTooltip({
  active,
  payload,
  lifecycleData,
}: {
  readonly active?: boolean;
  readonly payload?: Array<{
    name: string;
    value: number;
    payload: { fill: string };
  }>;
  readonly lifecycleData: { name: string; value: number; fill: string }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  const total = lifecycleData.reduce((s, item) => s + item.value, 0);
  const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0";
  return (
    <div
      style={{
        background: "var(--color-s800)",
        border: "1px solid var(--color-s700)",
        borderRadius: 6,
        padding: "6px 10px",
        fontSize: 11,
      }}
    >
      <div style={{ fontWeight: 600, color: d.payload.fill }}>{d.name}</div>
      <div style={{ color: "var(--color-t2)" }}>
        {d.value} clienți ({pct}%)
      </div>
    </div>
  );
}

type LifecyclePieSlice = { name: string; value: number; fill: string };

function DashboardLifecyclePieBlock({
  lifecycleLoading,
  pieData,
  lifecyclePie,
}: Readonly<{
  lifecycleLoading: boolean;
  pieData: LifecyclePieSlice[];
  lifecyclePie: LifecyclePieSlice[];
}>) {
  if (lifecycleLoading) {
    return <div style={{ fontSize: 12, color: "var(--color-t3)", height: 220 }}>Se încarcă…</div>;
  }
  if (pieData.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--color-t3)", padding: "24px 0" }}>
        Nu există înregistrări în `gold_nurturing_state` pentru acest tenant.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          opacity={0.85}
        />
        <Tooltip content={<CustomPieTooltip lifecycleData={lifecyclePie} />} />
        <Legend formatter={legendFormatter} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function DashboardKolFlowBlock({
  isLoading,
  kolNodes,
  kolEdges,
  selectedProfile,
  onToggleNodeId,
  onClosePanel,
}: Readonly<{
  isLoading: boolean;
  kolNodes: Node[];
  kolEdges: Edge[];
  selectedProfile: GraphKolProfileRow | undefined;
  onToggleNodeId: (nodeId: string) => void;
  onClosePanel: () => void;
}>) {
  if (isLoading) {
    return (
      <div style={{ padding: 24, fontSize: 12, color: "var(--color-t3)" }}>
        Se încarcă profiluri KOL…
      </div>
    );
  }
  if (kolNodes.length === 0) {
    return (
      <div style={{ padding: 24, fontSize: 12, color: "var(--color-t3)" }}>
        Nu există clustere cu `kolClientId` setat. Rulați detecția graph (E5) sau verificați datele
        Gold.
      </div>
    );
  }
  return (
    <>
      {selectedProfile ? <KolNodePanel profile={selectedProfile} onClose={onClosePanel} /> : null}
      <ReactFlow
        nodes={kolNodes}
        edges={kolEdges}
        onNodeClick={(_, node) => onToggleNodeId(node.id)}
        fitView
        attributionPosition="bottom-left"
        colorMode="dark"
        style={{
          background: "var(--color-s950)",
          borderRadius: "0 0 8px 8px",
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--color-s700)" />
        <Controls
          style={{
            background: "var(--color-s800)",
            border: "1px solid var(--color-s700)",
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            const label = String((node.data as { label?: string }).label ?? "");
            if (label.includes("modularity")) {
              const m = Number(label.split("modularity ").pop()?.slice(0, 6));
              if (!Number.isNaN(m) && m >= 0.35) return "var(--color-neuron-graph)";
            }
            return "var(--color-s600)";
          }}
          style={{
            background: "var(--color-s800)",
            border: "1px solid var(--color-s700)",
          }}
        />
      </ReactFlow>
    </>
  );
}

export function NurturingDashboard() {
  const lifecycleQueries = useQueries({
    queries: NURTURING_STATE_ORDER.map((state) => ({
      queryKey: ["e5", "nurturing", "lifecycle-count", state],
      queryFn: () => fetchNurturingStates({ currentState: state, page: 1, limit: 1 }),
    })),
  });

  const lifecyclePie = useMemo(
    () =>
      NURTURING_STATE_ORDER.map((state, i) => {
        const total = lifecycleQueries[i]?.data?.meta?.total ?? 0;
        return { name: state, value: total, fill: STATE_FILL[state] ?? "var(--color-t3)" };
      }),
    [lifecycleQueries],
  );

  const lifecycleLoading = lifecycleQueries.some((q) => q.isLoading);
  const lifecycleErr = lifecycleQueries.find((q) => q.error)?.error;

  const sumLifecycle = lifecyclePie.reduce((s, d) => s + d.value, 0);
  const atRiskCount = lifecyclePie.find((d) => d.name === "AT_RISK")?.value ?? 0;
  const churnedCount = lifecyclePie.find((d) => d.name === "CHURNED")?.value ?? 0;
  const reactivatedCount = lifecyclePie.find((d) => d.name === "REACTIVATED")?.value ?? 0;
  const activeLike =
    (lifecyclePie.find((d) => d.name === "NURTURING_ACTIVE")?.value ?? 0) +
    (lifecyclePie.find((d) => d.name === "LOYAL_CLIENT")?.value ?? 0) +
    (lifecyclePie.find((d) => d.name === "ADVOCATE")?.value ?? 0);
  const activePct = sumLifecycle > 0 ? ((activeLike / sumLifecycle) * 100).toFixed(0) : "0";

  const heatmapQuery = useQuery({
    queryKey: ["e5", "churn", "factors-heatmap"],
    queryFn: () => fetchChurnFactorsBatched(500),
  });
  const heatmapModel = useMemo(
    () => buildChurnJudetRiskHeatmap(heatmapQuery.data ?? []),
    [heatmapQuery.data],
  );

  const kolQ = useQuery({
    queryKey: ["e5", "graph", "kol-profiles"],
    queryFn: () => fetchGraphKolProfiles({ page: 1, limit: 100 }),
  });
  const relQ = useQuery({
    queryKey: ["e5", "graph", "relationships"],
    queryFn: () => fetchGraphRelationships({ page: 1, limit: 500 }),
    enabled: (kolQ.data?.data.length ?? 0) > 0,
  });

  const {
    nodes: kolNodes,
    edges: kolEdges,
    profileByClusterId,
  } = useMemo(() => {
    const prof = kolQ.data?.data ?? [];
    const rel = relQ.data?.data ?? [];
    if (prof.length === 0) {
      return {
        nodes: [] as Node[],
        edges: [] as Edge[],
        profileByClusterId: new Map<string, GraphKolProfileRow>(),
      };
    }
    return buildKolFlowGraph(prof, rel);
  }, [kolQ.data, relQ.data]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedProfile = selectedNodeId ? profileByClusterId.get(selectedNodeId) : undefined;

  let heatmapErrorMessage: string | null = null;
  if (heatmapQuery.error !== undefined && heatmapQuery.error !== null) {
    heatmapErrorMessage = messageFromUnknown(heatmapQuery.error);
  }

  const pieData = lifecyclePie.filter((d) => d.value > 0);
  let lifecycleErrorMsg: string | null = null;
  if (lifecycleErr !== undefined && lifecycleErr !== null) {
    lifecycleErrorMsg = messageFromUnknown(lifecycleErr);
  }

  return (
    <PageWrapper title="Nurturing Dashboard" actions={<EtapaBadge label="Etapa 5" />}>
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <KpiCard
          label="Clienți (lifecycle DB)"
          value={lifecycleLoading ? "…" : String(sumLifecycle)}
          icon="Users"
          color="var(--color-b5)"
        />
        <KpiCard
          label="La risc (AT_RISK)"
          value={lifecycleLoading ? "…" : String(atRiskCount)}
          icon="AlertTriangle"
          color="var(--color-wa)"
        />
        <KpiCard
          label="Churned"
          value={lifecycleLoading ? "…" : String(churnedCount)}
          icon="TrendingDown"
          color="var(--color-er)"
        />
        <KpiCard
          label="Reactivați"
          value={lifecycleLoading ? "…" : String(reactivatedCount)}
          icon="RefreshCcw"
          color="var(--color-ok)"
        />
      </div>

      {lifecycleErrorMsg ? (
        <div className="mb-4 text-sm text-er" role="alert">
          Eroare încărcare lifecycle: {lifecycleErrorMsg}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
        className="max-[1000px]:grid-cols-1"
      >
        <Card>
          <CardHeader>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={14} color="var(--color-neuron-lifecycle)" />
              <CardTitle>Distribuție stări nurturing</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            <DashboardLifecyclePieBlock
              lifecycleLoading={lifecycleLoading}
              pieData={pieData}
              lifecyclePie={lifecyclePie}
            />
            <div
              style={{
                textAlign: "center",
                fontSize: 11,
                color: "var(--color-t3)",
              }}
            >
              Total:{" "}
              <strong style={{ color: "var(--color-t1)" }}>{sumLifecycle.toLocaleString()}</strong>{" "}
              rânduri FSM {" • "} Activi (NURTURING+LOYAL+ADVOCATE):{" "}
              <strong style={{ color: "var(--color-ok)" }}>{activePct}%</strong>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <TrendingDown size={14} color="var(--color-neuron-churn)" />
              <CardTitle>Heatmap churn — județ × nivel risc</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            <ChurnHeatmapFromApi
              isLoading={heatmapQuery.isLoading}
              errorMessage={heatmapErrorMessage}
              model={heatmapModel}
            />
            <div style={{ marginTop: 10, fontSize: 10, color: "var(--color-t4)" }}>
              Agregare din eșantion paginat `GET /churn/factors` (max. 500 rânduri). Coloanele sunt
              județe cu cel mai mare număr de înregistrări în eșantion.
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Network size={14} color="var(--color-neuron-graph)" />
            <CardTitle>KOL — clustere cu lider (graph/kol-profiles)</CardTitle>
            <div style={{ marginLeft: "auto", fontSize: 10, color: "var(--color-t4)" }}>
              {kolNodes.length} noduri · {kolEdges.length} relații (filtrate între KOL)
            </div>
          </div>
        </CardHeader>
        <CardBody style={{ padding: 0, height: 380, position: "relative" }}>
          <DashboardKolFlowBlock
            isLoading={kolQ.isLoading}
            kolNodes={kolNodes}
            kolEdges={kolEdges}
            selectedProfile={selectedProfile}
            onToggleNodeId={(nodeId) =>
              setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId))
            }
            onClosePanel={() => setSelectedNodeId(null)}
          />
        </CardBody>
      </Card>

      <div
        style={{
          marginTop: 8,
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          fontSize: 10,
          color: "var(--color-t4)",
        }}
      >
        <span>Sursă date: API nurturing, churn, graph — fără coeficienți demo.</span>
        <span>Click pe nod pentru detalii cluster / companie KOL.</span>
      </div>
    </PageWrapper>
  );
}
