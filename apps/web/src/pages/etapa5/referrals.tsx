import { useState, useCallback } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/index.js";
import { Button } from "@/components/ui/button.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
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
import { X, Gift, Star } from "lucide-react";

interface KolEntry {
  id: string;
  name: string;
  company: string;
  cui: string;
  influence: number;
  tier: "Tier 1" | "Tier 2" | "Tier 3";
  referrals: number;
  converted: number;
  revenue: string;
  community: string;
}

const kolList: KolEntry[] = [
  {
    id: "k1",
    name: "Ion Popescu",
    company: "SC AgroSud SRL",
    cui: "12345678",
    influence: 92,
    tier: "Tier 1",
    referrals: 14,
    converted: 11,
    revenue: "EUR 89K",
    community: "Cluster Sud",
  },
  {
    id: "k2",
    name: "Maria Ionescu",
    company: "Cooperativa Agriland",
    cui: "87654321",
    influence: 78,
    tier: "Tier 1",
    referrals: 9,
    converted: 7,
    revenue: "EUR 54K",
    community: "Cluster Sud",
  },
  {
    id: "k3",
    name: "Andrei Marin",
    company: "OUAI Ialomița Nord",
    cui: "11223344",
    influence: 65,
    tier: "Tier 2",
    referrals: 6,
    converted: 4,
    revenue: "EUR 32K",
    community: "Cluster Nord",
  },
  {
    id: "k4",
    name: "Elena Dumitrescu",
    company: "SC Ferma Dunărea SA",
    cui: "99887766",
    influence: 54,
    tier: "Tier 2",
    referrals: 4,
    converted: 2,
    revenue: "EUR 18K",
    community: "Cluster Sud",
  },
];

const kolNodes: Node[] = [
  {
    id: "k1",
    position: { x: 250, y: 80 },
    data: { label: "Ion Popescu\n⭐ KOL Tier 1" },
    style: {
      background: "color-mix(in oklch, var(--color-neuron-graph) 25%, transparent)",
      border: "2px solid var(--color-neuron-graph)",
      borderRadius: 8,
      color: "var(--color-t1)",
      fontSize: 10,
      fontWeight: 700,
      padding: "6px 10px",
      width: 140,
      textAlign: "center" as const,
    },
  },
  {
    id: "k2",
    position: { x: 80, y: 200 },
    data: { label: "Maria Ionescu\n⭐ KOL Tier 1" },
    style: {
      background: "color-mix(in oklch, var(--color-neuron-graph) 20%, transparent)",
      border: "1.5px solid var(--color-neuron-graph)",
      borderRadius: 8,
      color: "var(--color-t1)",
      fontSize: 10,
      fontWeight: 600,
      padding: "5px 8px",
      width: 130,
      textAlign: "center" as const,
    },
  },
  {
    id: "k3",
    position: { x: 400, y: 200 },
    data: { label: "Andrei Marin\nKOL Tier 2" },
    style: {
      background: "color-mix(in oklch, var(--color-b5) 15%, transparent)",
      border: "1.5px solid var(--color-b5)",
      borderRadius: 8,
      color: "var(--color-t1)",
      fontSize: 10,
      padding: "5px 8px",
      width: 130,
      textAlign: "center" as const,
    },
  },
  {
    id: "k4",
    position: { x: 160, y: 320 },
    data: { label: "Elena Dumitrescu\nKOL Tier 2" },
    style: {
      background: "color-mix(in oklch, var(--color-b5) 15%, transparent)",
      border: "1.5px solid var(--color-b5)",
      borderRadius: 8,
      color: "var(--color-t1)",
      fontSize: 10,
      padding: "5px 8px",
      width: 130,
      textAlign: "center" as const,
    },
  },
  {
    id: "p1",
    position: { x: 80, y: 360 },
    data: { label: "Agro Plus SRL\n(prospect)" },
    style: {
      background: "var(--color-s800)",
      border: "1px solid var(--color-s700)",
      borderRadius: 6,
      color: "var(--color-t2)",
      fontSize: 9,
      padding: "4px 7px",
      width: 120,
      textAlign: "center" as const,
    },
  },
  {
    id: "p2",
    position: { x: 380, y: 340 },
    data: { label: "Grup Agrar Trans\n(prospect)" },
    style: {
      background: "var(--color-s800)",
      border: "1px solid var(--color-s700)",
      borderRadius: 6,
      color: "var(--color-t2)",
      fontSize: 9,
      padding: "4px 7px",
      width: 120,
      textAlign: "center" as const,
    },
  },
];

const kolEdges: Edge[] = [
  {
    id: "e1-2",
    source: "k1",
    target: "k2",
    style: { stroke: "var(--color-neuron-social)", strokeWidth: 1.5 },
    animated: true,
  },
  {
    id: "e1-3",
    source: "k1",
    target: "k3",
    style: { stroke: "var(--color-neuron-social)", strokeWidth: 1.5 },
    animated: true,
  },
  { id: "e2-4", source: "k2", target: "k4", style: { stroke: "var(--color-b5)", strokeWidth: 1 } },
  {
    id: "e2-p1",
    source: "k2",
    target: "p1",
    style: { stroke: "var(--color-s600)", strokeWidth: 1 },
    type: "step",
  },
  {
    id: "e3-p2",
    source: "k3",
    target: "p2",
    style: { stroke: "var(--color-s600)", strokeWidth: 1 },
    type: "step",
  },
];

function KolDetailPanel({
  kol,
  onClose,
}: {
  readonly kol: KolEntry;
  readonly onClose: () => void;
}) {
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
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-t1)" }}>{kol.name}</div>
          <div style={{ fontSize: 9, color: "var(--color-neuron-graph)", fontWeight: 600 }}>
            ⭐ {kol.tier}
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
          <X size={14} />
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-t4)" }}>Comunitate</span>
          <span style={{ color: "var(--color-b5)", fontWeight: 600 }}>{kol.community}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-t4)" }}>Influență</span>
          <span style={{ color: "var(--color-neuron-graph)", fontWeight: 700 }}>
            {kol.influence}%
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-t4)" }}>Referrals</span>
          <span style={{ color: "var(--color-t1)" }}>
            {kol.referrals} → {kol.converted} conv.
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-t4)" }}>Venit generat</span>
          <span style={{ color: "var(--color-ok)", fontWeight: 600 }}>{kol.revenue}</span>
        </div>
        <Button
          size="sm"
          style={{ marginTop: 6, fontSize: 10, gap: 4 }}
          onClick={() => {
            toast.success(`Recompensă trimisă lui ${kol.name}.`);
            onClose();
          }}
        >
          <Gift size={11} /> Trimite Recompensă
        </Button>
      </div>
    </div>
  );
}

export function Referrals() {
  const [nodes] = useState(kolNodes);
  const [edges] = useState(kolEdges);
  const [selectedKolId, setSelectedKolId] = useState<string | null>(null);
  const selectedKol = selectedKolId ? (kolList.find((k) => k.id === selectedKolId) ?? null) : null;

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedKolId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const totalReferrals = kolList.reduce((s, k) => s + k.referrals, 0);
  const totalConverted = kolList.reduce((s, k) => s + k.converted, 0);
  const totalRevenue = "EUR 193K";

  return (
    <PageWrapper title="Referrals KOL" actions={<EtapaBadge label="Etapa 5" />}>
      <div className="grid grid-cols-3 gap-4 mb-6 max-[700px]:grid-cols-1">
        <KpiCard
          label="KOL-uri Active"
          value={String(kolList.length)}
          icon="Users"
          color="var(--color-neuron-graph)"
        />
        <KpiCard
          label="Referrals Totale"
          value={String(totalReferrals)}
          icon="Share2"
          color="var(--color-b5)"
        />
        <KpiCard
          label="Venit Referral"
          value={totalRevenue}
          icon="TrendingUp"
          color="var(--color-ok)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
        {/* KOL List */}
        <Card>
          <CardHeader>
            <CardTitle>Ranking KOL</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {kolList.map((k, i) => (
                <div
                  key={k.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: "1px solid var(--color-s700)",
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background:
                        i < 2
                          ? "color-mix(in oklch, var(--color-neuron-graph) 20%, transparent)"
                          : "var(--color-s800)",
                      border: `1.5px solid ${i < 2 ? "var(--color-neuron-graph)" : "var(--color-s600)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      color: i < 2 ? "var(--color-neuron-graph)" : "var(--color-t3)",
                      flexShrink: 0,
                    }}
                  >
                    {i < 2 ? <Star size={9} /> : i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-t1)" }}>
                      {k.name}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--color-t3)" }}>{k.company}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{ fontSize: 12, fontWeight: 700, color: "var(--color-neuron-graph)" }}
                    >
                      {k.influence}%
                    </div>
                    <div style={{ fontSize: 9, color: "var(--color-t4)" }}>
                      {k.converted}/{k.referrals} conv.
                    </div>
                  </div>
                  <div style={{ width: 60 }}>
                    <ProgressBar value={k.influence} max={100} />
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 12,
                padding: "8px 10px",
                background: "color-mix(in oklch, var(--color-ok) 8%, transparent)",
                border: "1px solid color-mix(in oklch, var(--color-ok) 25%, transparent)",
                borderRadius: 6,
                fontSize: 10,
                color: "var(--color-t3)",
              }}
            >
              <strong style={{ color: "var(--color-ok)" }}>Conv. Rate:</strong>{" "}
              {((totalConverted / totalReferrals) * 100).toFixed(0)}% ({totalConverted}/
              {totalReferrals})
            </div>
          </CardBody>
        </Card>

        {/* KOL Graph ReactFlow */}
        <Card>
          <CardHeader>
            <CardTitle>Graf KOL — Comunitate Leiden</CardTitle>
          </CardHeader>
          <CardBody style={{ padding: 0, height: 340, position: "relative" }}>
            {selectedKol && (
              <KolDetailPanel kol={selectedKol} onClose={() => setSelectedKolId(null)} />
            )}
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodeClick={onNodeClick}
              fitView
              attributionPosition="bottom-left"
              colorMode="dark"
              style={{ background: "var(--color-s950)", borderRadius: "0 0 8px 8px" }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="var(--color-s700)"
              />
              <Controls
                style={{ background: "var(--color-s800)", border: "1px solid var(--color-s700)" }}
              />
              <MiniMap
                nodeColor={(node) =>
                  node.id.startsWith("k") ? "var(--color-neuron-graph)" : "var(--color-s600)"
                }
                style={{ background: "var(--color-s800)", border: "1px solid var(--color-s700)" }}
              />
            </ReactFlow>
          </CardBody>
        </Card>
      </div>

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
        <span>⭐ Tier 1 — Influencer primar (KOL cu centralitate Betweenness ridicată)</span>
        <span>Tier 2 — Influencer secundar (comunitate Leiden D21)</span>
        <span>Algoritm: Leiden D20-D24 · PageRank · Refresh 24h · Redis DB5</span>
      </div>
    </PageWrapper>
  );
}
