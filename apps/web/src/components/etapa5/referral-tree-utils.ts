import type { ReferralListRow } from "@/lib/etapa5-api.js";

export type ReferralForestNode = {
  readonly companyId: string;
  readonly label: string;
  readonly depth: number;
  readonly rows: readonly ReferralListRow[];
  readonly children: ReferralForestNode[];
};

function labelForCompanyId(id: string, rows: readonly ReferralListRow[]): string {
  const asReferrer = rows.find((r) => r.referrerId === id);
  if (asReferrer?.referrerName?.trim()) return asReferrer.referrerName.trim();
  const asReferred = rows.find((r) => r.referredId === id);
  if (asReferred?.referredName?.trim()) return asReferred.referredName.trim();
  return id.slice(0, 8);
}

/**
 * Construiește pădure de arbori referral: rădăcini = referrers care nu apar niciodată ca `referredId`.
 * Dacă există cicluri în date, muchiile duplicate sunt oprite prin `visited`.
 */
export function buildReferralForest(rows: readonly ReferralListRow[]): ReferralForestNode[] {
  const withChild = rows.filter((r): r is ReferralListRow & { referredId: string } =>
    Boolean(r.referredId),
  );
  if (withChild.length === 0) return [];

  const childIds = new Set(withChild.map((r) => r.referredId));
  const rootIds = new Set<string>();
  for (const r of withChild) {
    if (!childIds.has(r.referrerId)) rootIds.add(r.referrerId);
  }
  if (rootIds.size === 0) {
    const [first] = withChild;
    if (first) rootIds.add(first.referrerId);
  }

  function buildNode(companyId: string, depth: number, visited: Set<string>): ReferralForestNode {
    const outgoing = withChild.filter((r) => r.referrerId === companyId);
    const rowsHere = outgoing;
    const childIdsHere = [...new Set(outgoing.map((r) => r.referredId))];
    const children: ReferralForestNode[] = [];
    for (const cid of childIdsHere) {
      if (visited.has(cid)) continue;
      visited.add(cid);
      children.push(buildNode(cid, depth + 1, visited));
    }
    return {
      companyId,
      label: labelForCompanyId(companyId, rows),
      depth,
      rows: rowsHere,
      children,
    };
  }

  const roots = [...rootIds].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  const forest: ReferralForestNode[] = [];
  for (const rid of roots) {
    const v = new Set<string>([rid]);
    forest.push(buildNode(rid, 0, v));
  }
  return forest;
}

/** Statistici conversie pe adâncime (după construirea forest-ului). */
export function referralConversionByDepth(
  nodes: readonly ReferralForestNode[],
): Map<number, { total: number; converted: number }> {
  const map = new Map<number, { total: number; converted: number }>();

  function walk(n: ReferralForestNode) {
    for (const r of n.rows) {
      const d = n.depth;
      const cur = map.get(d) ?? { total: 0, converted: 0 };
      cur.total += 1;
      if (r.status === "CONVERTED") cur.converted += 1;
      map.set(d, cur);
    }
    for (const c of n.children) walk(c);
  }
  for (const root of nodes) walk(root);
  return map;
}
