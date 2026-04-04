import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { X, Star } from "lucide-react";
import {
  fetchGraphKolProfiles,
  fetchGraphRelationships,
  fetchReferralsList,
  type GraphKolProfileRow,
} from "@/lib/etapa5-api.js";
import { buildKolFlowGraph } from "@/lib/etapa5-kol-graph.js";

function KolDetailPanel({
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
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-t1)" }}>
            {profile.companyName?.trim() || "KOL"}
          </div>
          <div style={{ fontSize: 9, color: "var(--color-t3)", marginTop: 4 }}>
            Cluster: {profile.clusterName ?? "—"}
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
          <X size={14} />
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-t4)" }}>Membri cluster</span>
          <span style={{ color: "var(--color-neuron-graph)", fontWeight: 700 }}>
            {profile.memberCount}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-t4)" }}>Modularity</span>
          <span style={{ color: "var(--color-t1)" }}>
            {Number(profile.modularityScore).toFixed(4)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-t4)" }}>CUI</span>
          <span style={{ color: "var(--color-t2)" }}>{profile.cui ?? "—"}</span>
        </div>
        <Button
          size="sm"
          style={{ marginTop: 6, fontSize: 10, gap: 4 }}
          variant="outline"
          onClick={() => {
            toast.info(
              "Recompensele referral se gestionează din Referral Manager / API — fără acțiune directă KOL aici.",
            );
          }}
        >
          Ghid recompense
        </Button>
      </div>
    </div>
  );
}

type KolRankingCardContentProps = Readonly<{
  isLoading: boolean;
  sortedProfiles: GraphKolProfileRow[];
  maxMembers: number;
  referralsTotal: number;
  convertedTotal: number;
}>;

function KolRankingCardContent({
  isLoading,
  sortedProfiles,
  maxMembers,
  referralsTotal,
  convertedTotal,
}: KolRankingCardContentProps) {
  if (isLoading) {
    return <p className="text-sm text-t3">Se încarcă…</p>;
  }
  if (sortedProfiles.length === 0) {
    return <p className="text-sm text-t3">Nu există profiluri KOL. Rulați detecția graph E5.</p>;
  }
  return (
    <>
      <div className="space-y-3">
        {sortedProfiles.map((k, i) => {
          const top = maxMembers > 0 && k.memberCount === maxMembers;
          return (
            <div
              key={k.clusterId}
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
                  background: top
                    ? "color-mix(in oklch, var(--color-neuron-graph) 20%, transparent)"
                    : "var(--color-s800)",
                  border: `1.5px solid ${top ? "var(--color-neuron-graph)" : "var(--color-s600)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: top ? "var(--color-neuron-graph)" : "var(--color-t3)",
                  flexShrink: 0,
                }}
              >
                {top ? <Star size={9} /> : i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-t1)" }}>
                  {k.companyName?.trim() || "—"}
                </div>
                <div style={{ fontSize: 10, color: "var(--color-t3)" }}>
                  {k.clusterName ?? k.clusterId.slice(0, 8)} · {k.judet ?? "—"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-neuron-graph)" }}>
                  {k.memberCount} membri
                </div>
                <div style={{ fontSize: 9, color: "var(--color-t4)" }}>
                  mod. {Number(k.modularityScore).toFixed(3)}
                </div>
              </div>
              <div style={{ width: 60 }}>
                <ProgressBar
                  value={maxMembers > 0 ? Math.round((k.memberCount / maxMembers) * 100) : 0}
                  max={100}
                />
              </div>
            </div>
          );
        })}
      </div>
      {referralsTotal > 0 ? (
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
          <strong style={{ color: "var(--color-ok)" }}>Referral convertite:</strong>{" "}
          {convertedTotal} din {referralsTotal} (meta API, nu doar pagina curentă).
        </div>
      ) : null}
    </>
  );
}

type ReferralsGraphCardContentProps = Readonly<{
  isLoading: boolean;
  nodes: Node[];
  edges: Edge[];
  selectedProfile: GraphKolProfileRow | undefined;
  onToggleNodeId: (nodeId: string) => void;
  onClosePanel: () => void;
}>;

function ReferralsGraphCardContent({
  isLoading,
  nodes,
  edges,
  selectedProfile,
  onToggleNodeId,
  onClosePanel,
}: ReferralsGraphCardContentProps) {
  if (isLoading) {
    return <div className="p-4 text-sm text-t3">Se încarcă…</div>;
  }
  if (nodes.length === 0) {
    return (
      <div className="p-4 text-sm text-t3">Fără noduri — același criteriu ca lista din stânga.</div>
    );
  }
  return (
    <>
      {selectedProfile ? <KolDetailPanel profile={selectedProfile} onClose={onClosePanel} /> : null}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={(_, node) => onToggleNodeId(node.id)}
        fitView
        attributionPosition="bottom-left"
        colorMode="dark"
        style={{ background: "var(--color-s950)", borderRadius: "0 0 8px 8px" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--color-s700)" />
        <Controls
          style={{ background: "var(--color-s800)", border: "1px solid var(--color-s700)" }}
        />
        <MiniMap
          nodeColor={() => "var(--color-neuron-graph)"}
          style={{ background: "var(--color-s800)", border: "1px solid var(--color-s700)" }}
        />
      </ReactFlow>
    </>
  );
}

export function Referrals() {
  const kolQ = useQuery({
    queryKey: ["e5", "referrals-page", "kol-profiles"],
    queryFn: () => fetchGraphKolProfiles({ page: 1, limit: 100 }),
  });
  const relQ = useQuery({
    queryKey: ["e5", "referrals-page", "relationships"],
    queryFn: () => fetchGraphRelationships({ page: 1, limit: 500 }),
    enabled: (kolQ.data?.data.length ?? 0) > 0,
  });
  const refTotalQ = useQuery({
    queryKey: ["e5", "referrals-page", "referrals-total"],
    queryFn: () => fetchReferralsList({ page: 1, limit: 1 }),
  });
  const refConvQ = useQuery({
    queryKey: ["e5", "referrals-page", "referrals-converted"],
    queryFn: () => fetchReferralsList({ page: 1, limit: 1, status: "CONVERTED" }),
  });

  const { nodes, edges, profileByClusterId } = useMemo(() => {
    const prof = kolQ.data?.data ?? [];
    const rel = relQ.data?.data ?? [];
    if (prof.length === 0) {
      const emptyNodes: Node[] = [];
      const emptyEdges: Edge[] = [];
      return {
        nodes: emptyNodes,
        edges: emptyEdges,
        profileByClusterId: new Map<string, GraphKolProfileRow>(),
      };
    }
    return buildKolFlowGraph(prof, rel);
  }, [kolQ.data, relQ.data]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedProfile = selectedId ? profileByClusterId.get(selectedId) : undefined;

  const profiles = kolQ.data?.data ?? [];
  const maxMembers = profiles.length > 0 ? Math.max(...profiles.map((p) => p.memberCount)) : 0;
  const sortedProfiles = [...profiles].sort((a, b) => b.memberCount - a.memberCount);

  const kolTotal = kolQ.data?.meta?.total ?? profiles.length;
  const referralsTotal = refTotalQ.data?.meta?.total ?? 0;
  const convertedTotal = refConvQ.data?.meta?.total ?? 0;

  return (
    <PageWrapper title="Referrals KOL" actions={<EtapaBadge label="Etapa 5" />}>
      <div className="grid grid-cols-3 gap-4 mb-6 max-[700px]:grid-cols-1">
        <KpiCard
          label="Clustere cu KOL"
          value={kolQ.isLoading ? "…" : String(kolTotal)}
          icon="Users"
          color="var(--color-neuron-graph)"
        />
        <KpiCard
          label="Referral-uri (DB)"
          value={refTotalQ.isLoading ? "…" : String(referralsTotal)}
          icon="Share2"
          color="var(--color-b5)"
        />
        <KpiCard
          label="Convertite (DB)"
          value={refConvQ.isLoading ? "…" : String(convertedTotal)}
          icon="TrendingUp"
          color="var(--color-ok)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Ranking KOL (după membri cluster)</CardTitle>
          </CardHeader>
          <CardBody>
            <KolRankingCardContent
              isLoading={kolQ.isLoading}
              sortedProfiles={sortedProfiles}
              maxMembers={maxMembers}
              referralsTotal={referralsTotal}
              convertedTotal={convertedTotal}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Graf KOL (relationships între lideri)</CardTitle>
          </CardHeader>
          <CardBody style={{ padding: 0, height: 340, position: "relative" }}>
            <ReferralsGraphCardContent
              isLoading={kolQ.isLoading}
              nodes={nodes}
              edges={edges}
              selectedProfile={selectedProfile}
              onToggleNodeId={(nodeId) =>
                setSelectedId((prev) => (prev === nodeId ? null : nodeId))
              }
              onClosePanel={() => setSelectedId(null)}
            />
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
        <span>
          Date: `graph/kol-profiles`, `graph/relationships`, `referrals` — fără nume sau venituri
          inventate.
        </span>
      </div>
    </PageWrapper>
  );
}
