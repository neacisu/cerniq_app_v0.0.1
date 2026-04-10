import { describe, it, expect } from "vitest";
import type { ReferralListRow } from "@/lib/etapa5-api.js";
import {
  buildReferralForest,
  referralConversionByDepth,
} from "@/components/etapa5/referral-tree-utils.js";

function row(
  p: Partial<ReferralListRow> & Pick<ReferralListRow, "referrerId" | "referredId">,
): ReferralListRow {
  return {
    id: p.id ?? "1",
    tenantId: p.tenantId ?? "t",
    referrerId: p.referrerId,
    referredId: p.referredId,
    referralType: p.referralType ?? "DIRECT",
    status: p.status ?? "PENDING",
    consentGiven: p.consentGiven ?? true,
    consentGivenAt: p.consentGivenAt ?? null,
    rewardType: p.rewardType ?? null,
    rewardValue: p.rewardValue ?? null,
    rewardIssuedAt: p.rewardIssuedAt ?? null,
    expiresAt: p.expiresAt ?? new Date().toISOString(),
    createdAt: p.createdAt ?? new Date().toISOString(),
    updatedAt: p.updatedAt ?? new Date().toISOString(),
    referrerName: p.referrerName ?? null,
    referrerCui: p.referrerCui ?? null,
    referredName: p.referredName ?? null,
    referredCui: p.referredCui ?? null,
  };
}

describe("buildReferralForest", () => {
  it("rădăcină = referrer care nu e niciodată referred", () => {
    const rows = [
      row({
        id: "a",
        referrerId: "root-1",
        referredId: "child-1",
        referrerName: "RootCo",
        referredName: "ChildCo",
      }),
    ];
    const forest = buildReferralForest(rows);
    expect(forest).toHaveLength(1);
    expect(forest[0].companyId).toBe("root-1");
    expect(forest[0].children).toHaveLength(1);
    expect(forest[0].children[0].companyId).toBe("child-1");
  });

  it("sortează rădăcinile alfabetic stabil (localeCompare)", () => {
    const rows = [
      row({ id: "1", referrerId: "zebra-id", referredId: "c1" }),
      row({ id: "2", referrerId: "alpha-id", referredId: "c2" }),
    ];
    const forest = buildReferralForest(rows);
    expect(forest.map((n) => n.companyId)).toEqual(["alpha-id", "zebra-id"]);
  });

  it("oprește ciclul: A→B și B→A", () => {
    const rows = [
      row({ id: "1", referrerId: "A", referredId: "B" }),
      row({ id: "2", referrerId: "B", referredId: "A" }),
    ];
    const forest = buildReferralForest(rows);
    expect(forest.length).toBeGreaterThanOrEqual(1);
    const childA = forest[0].children.find((c) => c.companyId === "B");
    expect(childA?.children.length ?? 0).toBe(0);
  });
});

describe("referralConversionByDepth", () => {
  it("numără convertite la nivelul referrerului", () => {
    const rows = [
      row({
        id: "x",
        referrerId: "R",
        referredId: "C",
        status: "CONVERTED",
      }),
    ];
    const forest = buildReferralForest(rows);
    const m = referralConversionByDepth(forest);
    expect(m.get(0)?.total).toBe(1);
    expect(m.get(0)?.converted).toBe(1);
  });
});
