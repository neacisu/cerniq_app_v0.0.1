/**
 * Smoke renderHook pe hook-uri use-etapa2 (etapa2-api mock-uit).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mk, obj, list } = vi.hoisted(() => {
  const listFn = () =>
    vi.fn(() => Promise.resolve({ success: true as const, data: [] as unknown[] }));
  const objFn = (data: unknown) => vi.fn(() => Promise.resolve({ success: true as const, data }));
  return { mk: listFn, obj: objFn, list: listFn };
});

vi.mock("@/lib/etapa2-api", () => ({
  assignReview: mk(),
  createOutreachSequence: obj({ id: "s" }),
  createOutreachTemplate: obj({ id: "t" }),
  enrollLeadsInSequence: obj({ ok: true }),
  fetchOutreachCampaigns: list(),
  fetchOutreachAnalytics: obj({ series: [] }),
  fetchPhoneAnalytics: obj({ totals: {} }),
  fetchOutreachDailyStats: list(),
  fetchOutreachDashboard: obj({ kpis: {} }),
  fetchOutreachNotifications: list(),
  fetchOutreachSettings: obj({}),
  fetchOutreachLeadById: obj({ id: "l1" }),
  fetchLeadActivity: list(),
  fetchOutreachLeads: list(),
  fetchOutreachPhoneById: obj({ id: "p1" }),
  fetchOutreachPhones: list(),
  fetchOutreachReviewById: obj({ id: "r1" }),
  fetchOutreachReviews: list(),
  fetchOutreachSequenceById: obj({ id: "s1" }),
  fetchOutreachSequences: list(),
  fetchOutreachTemplateById: obj({ id: "t1" }),
  fetchOutreachTemplates: list(),
  fetchReviewStats: obj({}),
  initiateLeadTakeover: obj({}),
  markAllOutreachNotificationsRead: obj({ ok: true }),
  markOutreachNotificationRead: obj({ ok: true }),
  patchOutreachLead: obj({ id: "l" }),
  patchOutreachPhone: obj({ id: "p" }),
  patchOutreachSettings: obj({}),
  previewOutreachTemplate: obj({ body: "" }),
  resolveReview: obj({}),
  sendOutreachMessage: obj({ id: "m" }),
  triggerPhoneHealthCheck: obj({ ok: true }),
  updateOutreachSequence: obj({ id: "s" }),
  updateOutreachTemplate: obj({ id: "t" }),
}));

import {
  useOutreachDashboard,
  useOutreachSettings,
  usePatchOutreachSettings,
  useOutreachNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useOutreachAnalytics,
  useOutreachDailyStats,
  usePhoneAnalytics,
  useOutreachLeads,
  useOutreachLead,
  useLeadActivity,
  useUpdateLead,
  useSendMessage,
  useTakeover,
  useOutreachPhones,
  useOutreachPhone,
  useUpdatePhone,
  usePhoneHealthCheck,
  useOutreachSequences,
  useOutreachSequence,
  useCreateSequence,
  useUpdateSequence,
  useEnrollSequence,
  useOutreachTemplates,
  useOutreachTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  usePreviewTemplate,
  useOutreachReviews,
  useOutreachReview,
  useReviewStats,
  useAssignReview,
  useResolveReview,
  useOutreachCampaigns,
} from "@/hooks/use-etapa2.js";

function wrap(qc: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("use-etapa2 — smoke", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  const smoke = (name: string, fn: () => unknown) => {
    it(name, async () => {
      renderHook(fn, { wrapper: wrap(qc) });
      await waitFor(() => {
        expect(qc.isFetching()).toBe(0);
      });
    });
  };

  smoke("useOutreachDashboard", () => useOutreachDashboard("7d"));
  smoke("useOutreachSettings", () => useOutreachSettings());
  smoke("useOutreachNotifications", () => useOutreachNotifications());
  smoke("useOutreachAnalytics", () => useOutreachAnalytics({ period: "7d" }));
  smoke("useOutreachDailyStats", () => useOutreachDailyStats({}));
  smoke("usePhoneAnalytics", () => usePhoneAnalytics({ period: "30d" }));
  smoke("useOutreachLeads", () => useOutreachLeads({}));
  smoke("useOutreachLead", () => useOutreachLead("l1"));
  smoke("useLeadActivity", () => useLeadActivity("l1"));
  smoke("useOutreachPhones", () => useOutreachPhones());
  smoke("useOutreachPhone", () => useOutreachPhone("p1"));
  smoke("useOutreachSequences", () => useOutreachSequences({}));
  smoke("useOutreachSequence", () => useOutreachSequence("s1"));
  smoke("useOutreachTemplates", () => useOutreachTemplates({}));
  smoke("useOutreachTemplate", () => useOutreachTemplate("t1"));
  smoke("useOutreachReviews", () => useOutreachReviews({}));
  smoke("useOutreachReview", () => useOutreachReview("r1"));
  smoke("useReviewStats", () => useReviewStats());
  smoke("useOutreachCampaigns", () => useOutreachCampaigns());

  it("mutations rapide", async () => {
    const { result: patchSet } = renderHook(() => usePatchOutreachSettings(), {
      wrapper: wrap(qc),
    });
    await patchSet.current.mutateAsync({} as never);
    const { result: mark } = renderHook(() => useMarkNotificationRead(), { wrapper: wrap(qc) });
    await mark.current.mutateAsync("n1" as never);
    const { result: markAll } = renderHook(() => useMarkAllNotificationsRead(), {
      wrapper: wrap(qc),
    });
    await markAll.current.mutateAsync();
    const { result: updLead } = renderHook(() => useUpdateLead(), { wrapper: wrap(qc) });
    await updLead.current.mutateAsync({ id: "l1", payload: {} } as never);
    const { result: send } = renderHook(() => useSendMessage(), { wrapper: wrap(qc) });
    await send.current.mutateAsync({
      id: "l1",
      payload: { channel: "WHATSAPP", content: "hi" },
    } as never);
    const { result: takeover } = renderHook(() => useTakeover(), { wrapper: wrap(qc) });
    await takeover.current.mutateAsync({ id: "l1", reason: "r" } as never);
    const { result: updPhone } = renderHook(() => useUpdatePhone(), { wrapper: wrap(qc) });
    await updPhone.current.mutateAsync({ id: "p1", payload: {} } as never);
    const { result: health } = renderHook(() => usePhoneHealthCheck(), { wrapper: wrap(qc) });
    await health.current.mutateAsync("p1");
    const { result: createSeq } = renderHook(() => useCreateSequence(), { wrapper: wrap(qc) });
    await createSeq.current.mutateAsync({ name: "x", steps: [] } as never);
    const { result: updSeq } = renderHook(() => useUpdateSequence(), { wrapper: wrap(qc) });
    await updSeq.current.mutateAsync({ id: "s1", payload: {} } as never);
    const { result: enroll } = renderHook(() => useEnrollSequence(), { wrapper: wrap(qc) });
    await enroll.current.mutateAsync({
      sequenceId: "s1",
      payload: { leadIds: ["a"] },
    } as never);
    const { result: createTpl } = renderHook(() => useCreateTemplate(), { wrapper: wrap(qc) });
    await createTpl.current.mutateAsync({ name: "n", bodyTemplate: "b" } as never);
    const { result: updTpl } = renderHook(() => useUpdateTemplate(), { wrapper: wrap(qc) });
    await updTpl.current.mutateAsync({ id: "t1", payload: {} } as never);
    const { result: preview } = renderHook(() => usePreviewTemplate(), { wrapper: wrap(qc) });
    await preview.current.mutateAsync({ id: "t1" } as never);
    const { result: assignRev } = renderHook(() => useAssignReview(), { wrapper: wrap(qc) });
    await assignRev.current.mutateAsync({ id: "r1", userId: "u1" } as never);
    const { result: resolveRev } = renderHook(() => useResolveReview(), { wrapper: wrap(qc) });
    await resolveRev.current.mutateAsync({
      id: "r1",
      payload: { action: "approve" },
    } as never);
  });
});
