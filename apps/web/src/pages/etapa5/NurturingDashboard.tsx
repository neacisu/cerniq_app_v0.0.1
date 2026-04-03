/**
 * NurturingDashboard — E5 Client Lifecycle + Churn + KOL Community
 *
 * Vizualizări:
 * 1. PieChart Recharts — distribuție lifecycle (ACTIVE/AT_RISK/DORMANT/CHURNED/WIN_BACK)
 * 2. Churn Heatmap — intensitate risc per segment x perioadă
 * 3. KOL Graph ReactFlow — Key Opinion Leaders + cluster comunitar Leiden
 *
 * Plan: §XII L9482 — "state distribution + churn heatmap + KOL graph ReactFlow"
 * Workers: A1-A8 (lifecycle), B9-B14 (churn), D20-D24 (Leiden graph)
 */
import { useState, useCallback } from "react";
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

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function legendFormatter(value: string) {
  return <span style={{ fontSize: 10, color: "var(--color-t2)" }}>{value}</span>;
}

// recharts v3: `fill` in data items is used by Pie component directly (Cell deprecated)
const LIFECYCLE_DATA = [
  { name: "ACTIVE", value: 842, fill: "var(--color-ok)" },
  { name: "AT_RISK", value: 187, fill: "var(--color-wa)" },
  { name: "DORMANT", value: 134, fill: "var(--color-t3)" },
  { name: "CHURNED", value: 84, fill: "var(--color-er)" },
  { name: "WIN_BACK", value: 43, fill: "var(--color-b5)" },
];

// ─── Churn Heatmap Data ───────────────────────────────────────────────────────

const SEGMENTS = ["Premium", "Standard", "SME", "Rural", "New"];
const MONTHS = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun"];

const CHURN_HEATMAP: number[][] = [
  [2, 3, 2, 1, 2, 1],
  [8, 12, 9, 7, 11, 8],
  [15, 18, 14, 16, 20, 17],
  [22, 28, 25, 23, 31, 26],
  [5, 7, 6, 8, 6, 5],
];

function churnIntensityColor(value: number): string {
  if (value <= 5) return "oklch(0.25 0.05 145)";
  if (value <= 10) return "oklch(0.35 0.1 145)";
  if (value <= 15) return "oklch(0.55 0.15 80)";
  if (value <= 20) return "oklch(0.55 0.18 45)";
  return "oklch(0.55 0.22 27)";
}

function getChurnLabel(v: number): string {
  if (v <= 5) return "Scăzut";
  if (v <= 10) return "Mediu";
  if (v <= 15) return "Ridicat";
  if (v <= 20) return "Înalt";
  return "Critic";
}

function ChurnHeatmap() {
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
                width: 80,
              }}
            >
              Segment
            </th>
            {MONTHS.map((m) => (
              <th
                key={m}
                style={{
                  padding: "6px 8px",
                  textAlign: "center",
                  color: "var(--color-t3)",
                  fontWeight: 500,
                }}
              >
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SEGMENTS.map((segment, si) => (
            <tr key={segment}>
              <td
                style={{
                  padding: "4px 8px",
                  color: "var(--color-t2)",
                  fontWeight: 500,
                }}
              >
                {segment}
              </td>
              {CHURN_HEATMAP[si].map((value, mi) => (
                <td key={`${segment}-${MONTHS[mi]}`} style={{ padding: 2, textAlign: "center" }}>
                  <div
                    title={`${segment} - ${MONTHS[mi]}: ${value}% churn`}
                    aria-label={`${segment} ${MONTHS[mi]} ${value}% churn`}
                    style={{
                      background: churnIntensityColor(value),
                      borderRadius: 4,
                      padding: "6px 4px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600,
                      fontSize: 10,
                      color: "var(--color-t1)",
                    }}
                  >
                    {value}%
                  </div>
                </td>
              ))}
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
        }}
      >
        <span>Risc churn:</span>
        {[2, 8, 14, 22, 32].map((v) => (
          <div key={v} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: churnIntensityColor(v),
              }}
            />
            <span>{getChurnLabel(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── KOL Graph Data ───────────────────────────────────────────────────────────

const KOL_NODES: Node[] = [
  {
    id: "kol-1",
    position: { x: 250, y: 80 },
    data: { label: "SC AgroSud SRL\n⭐ KOL Tier 1" },
    style: {
      background: "color-mix(in oklch, var(--color-neuron-graph) 25%, transparent)",
      border: "2px solid var(--color-neuron-graph)",
      borderRadius: 8,
      color: "var(--color-t1)",
      fontSize: 10,
      fontWeight: 700,
      padding: "6px 10px",
      width: 140,
      textAlign: "center",
      boxShadow: "0 0 12px color-mix(in oklch, var(--color-neuron-graph) 50%, transparent)",
    },
  },
  {
    id: "kol-2",
    position: { x: 80, y: 200 },
    data: { label: "Cooperativa Agriland" },
    style: {
      background: "color-mix(in oklch, var(--color-neuron-social) 18%, transparent)",
      border: "1.5px solid var(--color-neuron-social)",
      borderRadius: 8,
      color: "var(--color-t1)",
      fontSize: 10,
      padding: "5px 8px",
      width: 130,
      textAlign: "center",
    },
  },
  {
    id: "kol-3",
    position: { x: 400, y: 200 },
    data: { label: "OUAI Ialomița Nord" },
    style: {
      background: "color-mix(in oklch, var(--color-neuron-social) 18%, transparent)",
      border: "1.5px solid var(--color-neuron-social)",
      borderRadius: 8,
      color: "var(--color-t1)",
      fontSize: 10,
      padding: "5px 8px",
      width: 130,
      textAlign: "center",
    },
  },
  {
    id: "kol-4",
    position: { x: 150, y: 320 },
    data: { label: "Agro Nord Impex SRL" },
    style: {
      background: "var(--color-s800)",
      border: "1px solid var(--color-s700)",
      borderRadius: 6,
      color: "var(--color-t2)",
      fontSize: 9,
      padding: "4px 7px",
      width: 120,
      textAlign: "center",
    },
  },
  {
    id: "kol-5",
    position: { x: 320, y: 320 },
    data: { label: "SC Ferma Dunărea SA\n⭐ KOL Tier 2" },
    style: {
      background: "color-mix(in oklch, var(--color-b5) 15%, transparent)",
      border: "1.5px solid var(--color-b5)",
      borderRadius: 8,
      color: "var(--color-t1)",
      fontSize: 10,
      fontWeight: 600,
      padding: "5px 8px",
      width: 140,
      textAlign: "center",
    },
  },
  {
    id: "kol-6",
    position: { x: 500, y: 280 },
    data: { label: "Grup Agrar Trans SRL" },
    style: {
      background: "var(--color-s800)",
      border: "1px solid var(--color-s700)",
      borderRadius: 6,
      color: "var(--color-t2)",
      fontSize: 9,
      padding: "4px 7px",
      width: 120,
      textAlign: "center",
    },
  },
];

const KOL_EDGES: Edge[] = [
  {
    id: "e1-2",
    source: "kol-1",
    target: "kol-2",
    style: { stroke: "var(--color-neuron-social)", strokeWidth: 1.5 },
    animated: true,
  },
  {
    id: "e1-3",
    source: "kol-1",
    target: "kol-3",
    style: { stroke: "var(--color-neuron-social)", strokeWidth: 1.5 },
    animated: true,
  },
  {
    id: "e2-4",
    source: "kol-2",
    target: "kol-4",
    style: { stroke: "var(--color-s600)", strokeWidth: 1 },
  },
  {
    id: "e3-5",
    source: "kol-3",
    target: "kol-5",
    style: { stroke: "var(--color-b5)", strokeWidth: 1.5 },
  },
  {
    id: "e3-6",
    source: "kol-3",
    target: "kol-6",
    style: { stroke: "var(--color-s600)", strokeWidth: 1 },
  },
  {
    id: "e5-4",
    source: "kol-5",
    target: "kol-4",
    style: { stroke: "var(--color-s600)", strokeWidth: 1 },
    type: "step",
  },
];

// ─── KOL Node Detail Panel ────────────────────────────────────────────────────

interface KolNodeInfo {
  id: string;
  name: string;
  tier: "1" | "2" | "3" | null;
  connections: number;
  centrality: string;
  community: string;
}

const KOL_NODE_INFO: Record<string, KolNodeInfo> = {
  "kol-1": {
    id: "kol-1",
    name: "SC AgroSud SRL",
    tier: "1",
    connections: 2,
    centrality: "0.82",
    community: "Cluster Sud",
  },
  "kol-2": {
    id: "kol-2",
    name: "Cooperativa Agriland",
    tier: null,
    connections: 2,
    centrality: "0.41",
    community: "Cluster Sud",
  },
  "kol-3": {
    id: "kol-3",
    name: "OUAI Ialomița Nord",
    tier: null,
    connections: 3,
    centrality: "0.53",
    community: "Cluster Nord",
  },
  "kol-4": {
    id: "kol-4",
    name: "Agro Nord Impex SRL",
    tier: null,
    connections: 2,
    centrality: "0.22",
    community: "Cluster Nord",
  },
  "kol-5": {
    id: "kol-5",
    name: "SC Ferma Dunărea SA",
    tier: "2",
    connections: 2,
    centrality: "0.61",
    community: "Cluster Sud",
  },
  "kol-6": {
    id: "kol-6",
    name: "Grup Agrar Trans SRL",
    tier: null,
    connections: 1,
    centrality: "0.18",
    community: "Cluster Nord",
  },
};

function KolNodePanel({
  nodeId,
  onClose,
}: {
  readonly nodeId: string;
  readonly onClose: () => void;
}) {
  const info = KOL_NODE_INFO[nodeId];
  if (!info) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 10,
        width: 220,
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
            {info.name}
          </div>
          {!!info.tier && (
            <div
              style={{
                fontSize: 9,
                color: "var(--color-neuron-graph)",
                fontWeight: 600,
                marginTop: 2,
              }}
            >
              ⭐ KOL TIER {info.tier}
            </div>
          )}
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
          <span style={{ color: "var(--color-t4)" }}>Comunitate</span>
          <span style={{ color: "var(--color-b5)", fontWeight: 600 }}>{info.community}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-t4)" }}>Conexiuni</span>
          <span style={{ color: "var(--color-t1)", fontWeight: 600 }}>{info.connections}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-t4)" }}>Centralitate</span>
          <span
            style={{
              color: "var(--color-neuron-graph)",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
            }}
          >
            {info.centrality}
          </span>
        </div>
        <div
          style={{
            marginTop: 4,
            padding: "4px 6px",
            background: "color-mix(in oklch, var(--color-neuron-social) 10%, transparent)",
            borderRadius: 4,
            fontSize: 10,
            color: "var(--color-t3)",
          }}
        >
          Algoritm Leiden D21 • PageRank D22
        </div>
      </div>
    </div>
  );
}

// ─── Custom PieChart Tooltip ──────────────────────────────────────────────────

function CustomPieTooltip({
  active,
  payload,
}: {
  readonly active?: boolean;
  readonly payload?: Array<{
    name: string;
    value: number;
    payload: { fill: string };
  }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  const total = LIFECYCLE_DATA.reduce((s, item) => s + item.value, 0);
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
        {d.value} clienți ({((d.value / total) * 100).toFixed(1)}%)
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function NurturingDashboard() {
  const [kolNodes] = useState(KOL_NODES);
  const [kolEdges] = useState(KOL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const totalClients = LIFECYCLE_DATA.reduce((s, d) => s + d.value, 0);
  const atRiskCount = LIFECYCLE_DATA.find((d) => d.name === "AT_RISK")?.value ?? 0;
  const churnedCount = LIFECYCLE_DATA.find((d) => d.name === "CHURNED")?.value ?? 0;
  const winBackCount = LIFECYCLE_DATA.find((d) => d.name === "WIN_BACK")?.value ?? 0;
  const activeCount = LIFECYCLE_DATA.find((d) => d.name === "ACTIVE")?.value ?? 0;
  const activePct = ((activeCount / totalClients) * 100).toFixed(0);

  return (
    <PageWrapper title="Nurturing Dashboard" actions={<EtapaBadge label="Etapa 5" />}>
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <KpiCard
          label="Clienți Totali"
          value={String(totalClients)}
          icon="Users"
          color="var(--color-b5)"
        />
        <KpiCard
          label="La Risc"
          value={String(atRiskCount)}
          icon="AlertTriangle"
          color="var(--color-wa)"
        />
        <KpiCard
          label="Churned"
          value={String(churnedCount)}
          icon="TrendingDown"
          color="var(--color-er)"
        />
        <KpiCard
          label="Win-Back Activ"
          value={String(winBackCount)}
          icon="RefreshCcw"
          color="var(--color-ok)"
        />
      </div>

      {/* Row 1: Lifecycle Pie + Churn Heatmap */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* Lifecycle Pie */}
        <Card>
          <CardHeader>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={14} color="var(--color-neuron-lifecycle)" />
              <CardTitle>Distribuție Lifecycle</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={LIFECYCLE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  opacity={0.85}
                />
                <Tooltip content={<CustomPieTooltip />} />
                <Legend formatter={legendFormatter} />
              </PieChart>
            </ResponsiveContainer>
            <div
              style={{
                textAlign: "center",
                fontSize: 11,
                color: "var(--color-t3)",
              }}
            >
              Total:{" "}
              <strong style={{ color: "var(--color-t1)" }}>{totalClients.toLocaleString()}</strong>{" "}
              clienți {" • "} Activi:{" "}
              <strong style={{ color: "var(--color-ok)" }}>{activePct}%</strong>
            </div>
          </CardBody>
        </Card>

        {/* Churn Heatmap */}
        <Card>
          <CardHeader>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <TrendingDown size={14} color="var(--color-neuron-churn)" />
              <CardTitle>Heatmap Risc Churn (%)</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            <ChurnHeatmap />
            <div style={{ marginTop: 10, fontSize: 10, color: "var(--color-t4)" }}>
              Segmentul Rural prezintă risc critic în Mai (31%). Claude Sonnet B14 recomandă
              campanie win-back urgentă.
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Row 2: KOL Graph ReactFlow */}
      <Card>
        <CardHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Network size={14} color="var(--color-neuron-graph)" />
            <CardTitle>KOL Graph — Comunitate Leiden</CardTitle>
            <div style={{ marginLeft: "auto", fontSize: 10, color: "var(--color-t4)" }}>
              Algoritm Leiden D20-D24 • {KOL_NODES.length} noduri • {KOL_EDGES.length} relații
            </div>
          </div>
        </CardHeader>
        <CardBody style={{ padding: 0, height: 380, position: "relative" }}>
          {!!selectedNodeId && (
            <KolNodePanel nodeId={selectedNodeId} onClose={() => setSelectedNodeId(null)} />
          )}
          <ReactFlow
            nodes={kolNodes}
            edges={kolEdges}
            onNodeClick={onNodeClick}
            fitView
            attributionPosition="bottom-left"
            colorMode="dark"
            style={{
              background: "var(--color-s950)",
              borderRadius: "0 0 8px 8px",
            }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="var(--color-s700)"
            />
            <Controls
              style={{
                background: "var(--color-s800)",
                border: "1px solid var(--color-s700)",
              }}
            />
            <MiniMap
              nodeColor={(node) => {
                const label = (node.data as { label: string }).label;
                if (label.includes("KOL Tier 1")) {
                  return "var(--color-neuron-graph)";
                }
                if (label.includes("KOL Tier 2")) return "var(--color-b5)";
                return "var(--color-s600)";
              }}
              style={{
                background: "var(--color-s800)",
                border: "1px solid var(--color-s700)",
              }}
            />
          </ReactFlow>
        </CardBody>
      </Card>

      {/* Legend */}
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
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: "var(--color-neuron-graph)",
              opacity: 0.8,
            }}
          />
          KOL Tier 1 — Influencer primar
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: "var(--color-neuron-social)",
              opacity: 0.8,
            }}
          />
          Conexiune directă
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: "var(--color-b5)",
              opacity: 0.7,
            }}
          />
          KOL Tier 2 — Influencer secundar
        </span>
        <span>Algoritm Leiden: centralitate Betweenness + PageRank • Redis DB 5 • Refresh 24h</span>
      </div>
    </PageWrapper>
  );
}
