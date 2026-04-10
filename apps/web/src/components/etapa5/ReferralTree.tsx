import { useMemo } from "react";
import type { ReferralListRow } from "@/lib/etapa5-api.js";
import {
  buildReferralForest,
  referralConversionByDepth,
  type ReferralForestNode,
} from "./referral-tree-utils.js";

function TreeBranch({ node }: { readonly node: ReferralForestNode }) {
  const conv =
    node.rows.length > 0
      ? `${node.rows.filter((r) => r.status === "CONVERTED").length}/${node.rows.length} convertite`
      : null;
  return (
    <li className="list-none">
      <div className="border-l-2 border-s600 pl-3 py-1">
        <div className="text-sm font-semibold text-t1">{node.label}</div>
        <div className="text-[10px] text-t4 font-mono">{node.companyId}</div>
        {conv ? <div className="text-xs text-t3 mt-0.5">{conv} (la acest nivel)</div> : null}
        {node.children.length > 0 ? (
          <ul className="mt-2 space-y-1 pl-2 border-l border-s700">
            {node.children.map((c) => (
              <TreeBranch key={`${node.companyId}-${c.companyId}`} node={c} />
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

export type ReferralTreeProps = {
  readonly rows: readonly ReferralListRow[];
  readonly isLoading?: boolean;
};

/** Arbore referral din lista API (referredId → copil); rate conversie pe adâncime. */
export function ReferralTree({ rows, isLoading }: ReferralTreeProps) {
  const forest = useMemo(() => buildReferralForest(rows), [rows]);
  const byDepth = useMemo(() => referralConversionByDepth(forest), [forest]);

  const depthSummary = useMemo(() => {
    const keys = [...byDepth.keys()].sort((a, b) => a - b);
    return keys.map((d) => {
      const s = byDepth.get(d);
      if (!s || s.total === 0) return `${d}: —`;
      const pct = ((s.converted / s.total) * 100).toFixed(0);
      return `Nivel ${d}: ${pct}% (${s.converted}/${s.total})`;
    });
  }, [byDepth]);

  if (isLoading) {
    return <p className="text-sm text-t3">Se încarcă arborele referral…</p>;
  }
  if (forest.length === 0) {
    return (
      <p className="text-sm text-t3">
        Nu există lanțuri referral cu `referredId` populat — verificați datele API.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {depthSummary.length > 0 ? (
        <div className="flex flex-wrap gap-2 text-[11px] text-t3">
          {depthSummary.map((t) => (
            <span
              key={t}
              className="rounded border border-s700 bg-s800/80 px-2 py-1 font-mono text-t2"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
      <ul className="space-y-3">
        {forest.map((root) => (
          <TreeBranch key={root.companyId} node={root} />
        ))}
      </ul>
    </div>
  );
}
