/**
 * Etapa 2 outreach: pagini checklist — mock hook-uri (formă API), rute /leads vs /outreach/leads.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import React from "react";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/etapa2-api.js", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/etapa2-api.js")>();
  return {
    ...mod,
    importOutreachLeads: vi.fn(() =>
      Promise.resolve({
        success: true,
        data: { created: 1, rejectedNoContact: 0, rejectedDuplicate: 0, errors: 0 },
      }),
    ),
    downloadOutreachLeadsCsv: vi.fn(() => Promise.resolve()),
  };
});

vi.mock("@/hooks/use-etapa2.js", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/hooks/use-etapa2.js")>();
  return {
    ...mod,
    useOutreachDashboard: vi.fn(mod.useOutreachDashboard),
    useOutreachLeads: vi.fn(mod.useOutreachLeads),
    useOutreachSequences: vi.fn(mod.useOutreachSequences),
    useOutreachTemplates: vi.fn(mod.useOutreachTemplates),
    useOutreachPhones: vi.fn(mod.useOutreachPhones),
    useOutreachSettings: vi.fn(mod.useOutreachSettings),
    usePatchOutreachSettings: vi.fn(mod.usePatchOutreachSettings),
    useOutreachReviews: vi.fn(mod.useOutreachReviews),
    useOutreachCampaigns: vi.fn(mod.useOutreachCampaigns),
    useOutreachAnalytics: vi.fn(mod.useOutreachAnalytics),
    useOutreachDailyStats: vi.fn(mod.useOutreachDailyStats),
    usePhoneAnalytics: vi.fn(mod.usePhoneAnalytics),
  };
});

import {
  useOutreachAnalytics,
  useOutreachCampaigns,
  useOutreachDailyStats,
  useOutreachDashboard,
  useOutreachLeads,
  useOutreachPhones,
  useOutreachReviews,
  useOutreachSequences,
  useOutreachSettings,
  useOutreachTemplates,
  usePatchOutreachSettings,
  usePhoneAnalytics,
} from "@/hooks/use-etapa2.js";
import { importOutreachLeads } from "@/lib/etapa2-api.js";
import { Outreach } from "@/pages/etapa2/outreach.js";
import { Leads } from "@/pages/etapa2/leads.js";
import { LeadsImport } from "@/pages/etapa2/leads-import.js";
import { Templates } from "@/pages/etapa2/templates.js";
import { Phones } from "@/pages/etapa2/phones.js";
import { OutreachSettingsPage } from "@/pages/etapa2/outreach-settings.js";
import { Review } from "@/pages/etapa2/review.js";
import { Campaigns } from "@/pages/etapa2/campaigns.js";
import { Analytics } from "@/pages/etapa2/analytics.js";
import { Sequences } from "@/pages/etapa2/sequences.js";

const dashboardBody = {
  kpis: {
    messagesSent: 7,
    replies: 2,
    conversionRate: 3.5,
    activeSequences: 1,
    pendingReviews: 0,
  },
  channelPerformance: [] as {
    channel: string;
    sent: number;
    delivered: number;
    replied: number;
    bounced: number;
  }[],
  leadFunnel: [{ state: "COLD" as const, count: 3 }],
  sentimentDistribution: [{ category: "neutru", count: 2 }],
  recentActivity: [] as {
    id: string;
    leadId: string;
    company: string;
    action: string;
    timestamp: string;
  }[],
  phones: [],
};

const leadRow = {
  id: "l1",
  tenantId: "t1",
  leadId: "lj1",
  companyId: "gc1",
  currentState: "COLD" as const,
  previousState: null,
  stateChangedAt: "2026-01-01T00:00:00.000Z",
  channel: "WHATSAPP" as const,
  assignedPhoneId: null,
  isHumanControlled: false,
  requiresHumanReview: false,
  nextActionAt: null,
  sentimentScore: 0,
  intent: null,
  engagementScore: null,
  lastContactAt: null,
  assignedToUser: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  company: {
    id: "c1",
    name: "Firma RTL",
    cui: "",
    judet: "",
    localitate: "",
    telefon: null,
    email: null,
    whatsappNumber: null,
    contactName: null,
    website: null,
  },
};

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("Etapa 2 pages (RTL + hook mock)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePatchOutreachSettings).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as never);
    vi.mocked(usePhoneAnalytics).mockReturnValue({
      data: { success: true, data: { phones: [] } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
  });

  it("Outreach dashboard: KPI din payload mock", async () => {
    vi.mocked(useOutreachDashboard).mockReturnValue({
      data: { success: true, data: dashboardBody },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    wrap(
      <MemoryRouter>
        <Outreach />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Mesaje Trimise")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("Lead Management: aceeași pagină pe /leads și pe /outreach/leads", async () => {
    vi.mocked(useOutreachLeads).mockReturnValue({
      data: {
        success: true,
        data: [leadRow],
        meta: { total: 1, page: 1, limit: 20 },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    const { unmount } = wrap(
      <MemoryRouter initialEntries={["/leads"]}>
        <Routes>
          <Route path="/leads" element={<Leads />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: /Lead Management/i })).toBeInTheDocument();
    expect(screen.getByText("Firma RTL")).toBeInTheDocument();
    unmount();

    wrap(
      <MemoryRouter initialEntries={["/outreach/leads"]}>
        <Routes>
          <Route path="/outreach/leads" element={<Leads />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: /Lead Management/i })).toBeInTheDocument();
    expect(screen.getByText("Firma RTL")).toBeInTheDocument();
  });

  it("Import leads CSV: apelează importOutreachLeads după parsare", async () => {
    const user = userEvent.setup();
    const { container } = wrap(
      <MemoryRouter>
        <LeadsImport />
      </MemoryRouter>,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    const csv = "denumire;email\nFirma X;a@b.c\n";
    const file = new File([csv], "leads.csv", { type: "text/csv" });
    await user.upload(input, file);
    await waitFor(() => expect(vi.mocked(importOutreachLeads)).toHaveBeenCalled());
  });

  it("Templates: randare din listă mock", async () => {
    vi.mocked(useOutreachTemplates).mockReturnValue({
      data: {
        success: true,
        data: [
          {
            id: "t1",
            tenantId: "tn",
            name: "Tpl RTL",
            description: null,
            channel: "WHATSAPP",
            subject: null,
            bodyTemplate: "Hi",
            templateType: "TEXT",
            status: "ACTIVE",
            variables: [],
            hasMedia: false,
            mediaType: null,
            mediaUrl: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        meta: { total: 1, limit: 20, offset: 0 },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    wrap(
      <MemoryRouter>
        <Templates />
      </MemoryRouter>,
    );
    expect((await screen.findAllByText("Tpl RTL")).length).toBeGreaterThanOrEqual(1);
  });

  it("Phones: randare număr din API mock", async () => {
    vi.mocked(useOutreachPhones).mockReturnValue({
      data: {
        success: true,
        data: [
          {
            id: "p1",
            tenantId: "t1",
            phoneNumber: "+40700000000",
            label: "Linie test",
            timelinesaiPhoneId: null,
            status: "ACTIVE",
            isEnabled: true,
            priority: 1,
            dailyQuotaLimit: 100,
            reputationScore: 80,
            lastHealthCheckAt: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        meta: { total: 1, limit: 20, offset: 0 },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    wrap(
      <MemoryRouter>
        <Phones />
      </MemoryRouter>,
    );
    expect(await screen.findByText("+40700000000")).toBeInTheDocument();
  });

  it("Outreach settings: afișează formular din snapshot mock", async () => {
    vi.mocked(useOutreachSettings).mockReturnValue({
      data: {
        success: true,
        data: {
          tenantId: "t1",
          businessHoursStart: "09:00",
          businessHoursEnd: "18:00",
          timezone: "Europe/Bucharest",
          dailyQuotaLimit: 500,
          followupQuotaLimit: 50,
          emailSignature: "",
          waReplyTimeoutMinutes: 30,
          workDays: [1, 2, 3, 4, 5],
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    wrap(
      <MemoryRouter>
        <OutreachSettingsPage />
      </MemoryRouter>,
    );
    expect(await screen.findByDisplayValue("Europe/Bucharest")).toBeInTheDocument();
  });

  it("Review: listă goală din mock", async () => {
    vi.mocked(useOutreachReviews).mockReturnValue({
      data: { success: true, data: [], meta: { total: 0, limit: 20, offset: 0 } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    wrap(
      <MemoryRouter>
        <Review />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText(/Nu există mesaje în așteptarea revizuirii/i),
    ).toBeInTheDocument();
  });

  it("Campaigns: campanie din mock", async () => {
    vi.mocked(useOutreachCampaigns).mockReturnValue({
      data: {
        success: true,
        data: [
          {
            id: "c1",
            name: "Campanie RTL",
            status: "ACTIVE",
            sent: 10,
            opens: 2,
            replies: 1,
            bounces: 0,
            bounceRate: 0,
          },
        ],
        meta: { total: 1, limit: 20, offset: 0 },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    wrap(
      <MemoryRouter>
        <Campaigns />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Campanie RTL")).toBeInTheDocument();
  });

  it("Analytics: mesaje trimise WhatsApp din mock", async () => {
    vi.mocked(useOutreachAnalytics).mockReturnValue({
      data: {
        success: true,
        data: {
          period: "7d",
          byChannel: {
            whatsapp: { sent: 42, delivered: 40, replied: 5, quotaUsed: 10 },
            emailCold: { sent: 0, opened: 0, replied: 0, bounced: 0 },
            emailWarm: { sent: 0, opened: 0, replied: 0, bounced: 0 },
          },
          funnel: [],
          sentiment: { negative: 0, neutral: 1, positive: 0 },
          daily: [],
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useOutreachDailyStats).mockReturnValue({
      data: { success: true, data: [], meta: { total: 0, limit: 30, offset: 0 } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    wrap(
      <MemoryRouter>
        <Analytics />
      </MemoryRouter>,
    );
    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
  });

  it("Sequences: secvență din listă mock", async () => {
    vi.mocked(useOutreachSequences).mockReturnValue({
      data: {
        success: true,
        data: [
          {
            id: "seq1",
            tenantId: "t1",
            name: "Secv RTL",
            description: null,
            isActive: true,
            stopOnReply: true,
            respectBusinessHours: true,
            totalEnrolled: 0,
            totalCompletions: 0,
            totalConversions: 0,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        meta: { total: 1, limit: 20, offset: 0 },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    wrap(
      <MemoryRouter>
        <Sequences />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Secv RTL")).toBeInTheDocument();
  });
});
