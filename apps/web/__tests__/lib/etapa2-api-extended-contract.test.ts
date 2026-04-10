/**
 * Contract HTTP restant pentru `etapa2-api`: leads (CRUD, import, mesaje), secvențe, template-uri,
 * telefoane, reviews, setări, notificări, analytics — plus export CSV (fetch).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "@/lib/api.js";
import {
  downloadOutreachLeadsCsv,
  fetchLeadActivity,
  createOutreachLeadsFromGold,
  importOutreachLeads,
  patchOutreachLead,
  sendOutreachMessage,
  initiateLeadTakeover,
  fetchOutreachSequenceById,
  createOutreachSequence,
  updateOutreachSequence,
  enrollLeadsInSequence,
  fetchOutreachTemplateById,
  createOutreachTemplate,
  updateOutreachTemplate,
  previewOutreachTemplate,
  fetchOutreachPhoneById,
  patchOutreachPhone,
  triggerPhoneHealthCheck,
  fetchOutreachReviews,
  fetchOutreachReviewById,
  assignReview,
  resolveReview,
  fetchReviewStats,
  fetchOutreachSettings,
  patchOutreachSettings,
  fetchOutreachNotifications,
  markOutreachNotificationRead,
  markAllOutreachNotificationsRead,
  fetchPhoneAnalytics,
  fetchOutreachDailyStats,
} from "@/lib/etapa2-api.js";

describe("etapa2-api — leads + import + mesaje", () => {
  beforeEach(() => {
    vi.spyOn(api, "get").mockResolvedValue({ success: true, data: [] });
    vi.spyOn(api, "post").mockResolvedValue({ success: true, data: {} });
    vi.spyOn(api, "patch").mockResolvedValue({ success: true, data: {} });
  });
  afterEach(() => vi.restoreAllMocks());

  it("fetchLeadActivity", async () => {
    await fetchLeadActivity("L1");
    expect(api.get).toHaveBeenCalledWith("/api/v1/outreach/leads/L1/activity");
  });

  it("createOutreachLeadsFromGold", async () => {
    await createOutreachLeadsFromGold(["g1", "g2"]);
    expect(api.post).toHaveBeenCalledWith("/api/v1/outreach/leads", {
      goldCompanyIds: ["g1", "g2"],
    });
  });

  it("importOutreachLeads", async () => {
    await importOutreachLeads([{ denumire: "X" }]);
    expect(api.post).toHaveBeenCalledWith("/api/v1/outreach/leads/import", {
      rows: [{ denumire: "X" }],
    });
  });

  it("patchOutreachLead", async () => {
    await patchOutreachLead("L1", { isHumanControlled: true });
    expect(api.patch).toHaveBeenCalledWith("/api/v1/outreach/leads/L1", {
      isHumanControlled: true,
    });
  });

  it("sendOutreachMessage", async () => {
    await sendOutreachMessage("L1", { channel: "WHATSAPP", content: "hi" });
    expect(api.post).toHaveBeenCalledWith("/api/v1/outreach/leads/L1/send-message", {
      channel: "WHATSAPP",
      content: "hi",
    });
  });

  it("initiateLeadTakeover", async () => {
    await initiateLeadTakeover("L1", "need human");
    expect(api.post).toHaveBeenCalledWith("/api/v1/outreach/leads/L1/takeover", {
      reason: "need human",
    });
  });
});

describe("etapa2-api — secvențe", () => {
  beforeEach(() => {
    vi.spyOn(api, "get").mockResolvedValue({ success: true, data: {} });
    vi.spyOn(api, "post").mockResolvedValue({ success: true, data: {} });
    vi.spyOn(api, "patch").mockResolvedValue({ success: true, data: {} });
  });
  afterEach(() => vi.restoreAllMocks());

  it("fetchOutreachSequenceById", async () => {
    await fetchOutreachSequenceById("s1");
    expect(api.get).toHaveBeenCalledWith("/api/v1/outreach/sequences/s1");
  });

  it("createOutreachSequence", async () => {
    await createOutreachSequence({
      name: "N",
      primaryChannel: "WHATSAPP",
      steps: [{ delayHours: 0, delayMinutes: 0, channel: "WHATSAPP" }],
    });
    expect(api.post).toHaveBeenCalledWith(
      "/api/v1/outreach/sequences",
      expect.objectContaining({ name: "N" }),
    );
  });

  it("updateOutreachSequence", async () => {
    await updateOutreachSequence("s1", { name: "N2" });
    expect(api.patch).toHaveBeenCalledWith("/api/v1/outreach/sequences/s1", { name: "N2" });
  });

  it("enrollLeadsInSequence", async () => {
    await enrollLeadsInSequence("s1", { leadIds: ["a", "b"] });
    expect(api.post).toHaveBeenCalledWith("/api/v1/outreach/sequences/s1/enroll", {
      leadIds: ["a", "b"],
    });
  });
});

describe("etapa2-api — template-uri", () => {
  beforeEach(() => {
    vi.spyOn(api, "get").mockResolvedValue({ success: true, data: {} });
    vi.spyOn(api, "post").mockResolvedValue({ success: true, data: {} });
    vi.spyOn(api, "patch").mockResolvedValue({ success: true, data: {} });
  });
  afterEach(() => vi.restoreAllMocks());

  it("fetchOutreachTemplateById", async () => {
    await fetchOutreachTemplateById("t1");
    expect(api.get).toHaveBeenCalledWith("/api/v1/outreach/templates/t1");
  });

  it("createOutreachTemplate", async () => {
    await createOutreachTemplate({
      name: "T",
      channel: "WHATSAPP",
      bodyTemplate: "x",
      templateType: "INITIAL",
    });
    expect(api.post).toHaveBeenCalledWith(
      "/api/v1/outreach/templates",
      expect.objectContaining({ name: "T" }),
    );
  });

  it("updateOutreachTemplate", async () => {
    await updateOutreachTemplate("t1", { status: "DRAFT" });
    expect(api.patch).toHaveBeenCalledWith("/api/v1/outreach/templates/t1", { status: "DRAFT" });
  });

  it("previewOutreachTemplate", async () => {
    await previewOutreachTemplate("t1", { variables: { a: "b" } });
    expect(api.post).toHaveBeenCalledWith("/api/v1/outreach/templates/t1/preview", {
      variables: { a: "b" },
    });
  });
});

describe("etapa2-api — telefoane", () => {
  beforeEach(() => {
    vi.spyOn(api, "get").mockResolvedValue({ success: true, data: {} });
    vi.spyOn(api, "post").mockResolvedValue({ success: true, data: {} });
    vi.spyOn(api, "patch").mockResolvedValue({ success: true, data: {} });
  });
  afterEach(() => vi.restoreAllMocks());

  it("fetchOutreachPhoneById", async () => {
    await fetchOutreachPhoneById("p1");
    expect(api.get).toHaveBeenCalledWith("/api/v1/outreach/phones/p1");
  });

  it("patchOutreachPhone", async () => {
    await patchOutreachPhone("p1", { label: "main" });
    expect(api.patch).toHaveBeenCalledWith("/api/v1/outreach/phones/p1", { label: "main" });
  });

  it("triggerPhoneHealthCheck", async () => {
    await triggerPhoneHealthCheck("p1");
    expect(api.post).toHaveBeenCalledWith("/api/v1/outreach/phones/p1/health-check", {});
  });
});

describe("etapa2-api — reviews", () => {
  beforeEach(() => {
    vi.spyOn(api, "get").mockResolvedValue({ success: true, data: [] });
    vi.spyOn(api, "post").mockResolvedValue({ success: true, data: {} });
  });
  afterEach(() => vi.restoreAllMocks());

  it("fetchOutreachReviews", async () => {
    await fetchOutreachReviews({ status: "PENDING" });
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining("/api/v1/outreach/reviews?"));
  });

  it("fetchOutreachReviewById", async () => {
    await fetchOutreachReviewById("r1");
    expect(api.get).toHaveBeenCalledWith("/api/v1/outreach/reviews/r1");
  });

  it("assignReview", async () => {
    await assignReview("r1", "u1");
    expect(api.post).toHaveBeenCalledWith("/api/v1/outreach/reviews/r1/assign", { userId: "u1" });
  });

  it("resolveReview", async () => {
    await resolveReview("r1", { action: "APPROVED" });
    expect(api.post).toHaveBeenCalledWith("/api/v1/outreach/reviews/r1/resolve", {
      action: "APPROVED",
    });
  });

  it("fetchReviewStats", async () => {
    await fetchReviewStats();
    expect(api.get).toHaveBeenCalledWith("/api/v1/outreach/reviews/stats");
  });
});

describe("etapa2-api — setări și notificări", () => {
  beforeEach(() => {
    vi.spyOn(api, "get").mockResolvedValue({ success: true, data: {} });
    vi.spyOn(api, "post").mockResolvedValue({ success: true });
    vi.spyOn(api, "patch").mockResolvedValue({ success: true, data: {} });
  });
  afterEach(() => vi.restoreAllMocks());

  it("fetchOutreachSettings / patchOutreachSettings", async () => {
    await fetchOutreachSettings();
    expect(api.get).toHaveBeenCalledWith("/api/v1/outreach/settings");
    await patchOutreachSettings({ timezone: "Europe/Bucharest" });
    expect(api.patch).toHaveBeenCalledWith("/api/v1/outreach/settings", {
      timezone: "Europe/Bucharest",
    });
  });

  it("fetchOutreachNotifications (toate / doar necitite)", async () => {
    await fetchOutreachNotifications();
    expect(api.get).toHaveBeenCalledWith("/api/v1/outreach/notifications");
    await fetchOutreachNotifications(true);
    expect(api.get).toHaveBeenCalledWith("/api/v1/outreach/notifications?unread=true");
  });

  it("markOutreachNotificationRead / markAllOutreachNotificationsRead", async () => {
    await markOutreachNotificationRead("n1");
    expect(api.patch).toHaveBeenCalledWith("/api/v1/outreach/notifications/n1/read", {});
    await markAllOutreachNotificationsRead();
    expect(api.post).toHaveBeenCalledWith("/api/v1/outreach/notifications/mark-all-read", {});
  });
});

describe("etapa2-api — analytics extra", () => {
  beforeEach(() => {
    vi.spyOn(api, "get").mockResolvedValue({ success: true, data: [] });
  });
  afterEach(() => vi.restoreAllMocks());

  it("fetchPhoneAnalytics", async () => {
    await fetchPhoneAnalytics({ phoneId: "p1", from: "2026-01-01" });
    expect(api.get).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/v1\/outreach\/analytics\/phones\?/),
    );
  });

  it("fetchOutreachDailyStats", async () => {
    await fetchOutreachDailyStats({ from: "2026-01-01", to: "2026-01-31" });
    expect(api.get).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/v1\/outreach\/analytics\/daily\?/),
    );
  });
});

describe("etapa2-api — downloadOutreachLeadsCsv (fetch)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("GET export + declanșare descărcare", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["a,b"], { type: "text/csv" }),
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    await downloadOutreachLeadsCsv({ page: 2, limit: 5 });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/outreach\/leads\/export\?(?:.*&)?page=2/),
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
    clickSpy.mockRestore();
  });
});
