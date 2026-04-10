import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/index.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { Star } from "lucide-react";
import { KolGraph } from "@/components/etapa5/KolGraph.js";
import { ReferralTree } from "@/components/etapa5/ReferralTree.js";
import {
  fetchGraphKolProfiles,
  fetchGraphRelationships,
  fetchReferralsList,
  type GraphKolProfileRow,
} from "@/lib/etapa5-api.js";

/** Referință stabilă pentru `?? []` — evită invalidarea useMemo la fiecare render când query-ul nu are încă date. */
const EMPTY_KOL_PROFILES: readonly GraphKolProfileRow[] = [];

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
  const refTreeQ = useQuery({
    queryKey: ["e5", "referrals-page", "referral-tree"],
    queryFn: () => fetchReferralsList({ page: 1, limit: 200 }),
  });

  const profiles = kolQ.data?.data ?? EMPTY_KOL_PROFILES;
  const maxMembers = profiles.length > 0 ? Math.max(...profiles.map((p) => p.memberCount)) : 0;
  const sortedProfiles = useMemo(
    () => [...profiles].sort((a, b) => b.memberCount - a.memberCount),
    [profiles],
  );

  const kolTotal = kolQ.data?.meta?.total ?? profiles.length;
  const referralsTotal = refTotalQ.data?.meta?.total ?? 0;
  const convertedTotal = refConvQ.data?.meta?.total ?? 0;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const kolRelationships = relQ.data?.data ?? [];

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

      <div className="grid grid-cols-2 gap-4 mb-6 max-[900px]:grid-cols-1">
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
            <KolGraph
              isLoading={kolQ.isLoading}
              profiles={profiles}
              relationships={kolRelationships}
              height={340}
              selectedId={selectedId}
              onToggleNodeId={(nodeId) =>
                setSelectedId((prev) => (prev === nodeId ? null : nodeId))
              }
              onClosePanel={() => setSelectedId(null)}
            />
          </CardBody>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Arbore referral (max. 200 înregistrări / pagină)</CardTitle>
        </CardHeader>
        <CardBody>
          <ReferralTree rows={refTreeQ.data?.data ?? []} isLoading={refTreeQ.isLoading} />
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
        <span>
          Date: `graph/kol-profiles`, `graph/relationships`, `referrals` — fără nume sau venituri
          inventate.
        </span>
      </div>
    </PageWrapper>
  );
}
