/**
 * Checklist E2: lead-detail, sequence-new/edit, template-new/edit, phone-detail — mock hook-uri + SequenceBuilder redus.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/outreach/dialogs/StateChangeDialog.js", () => ({
  StateChangeDialog: () => null,
}));
vi.mock("@/components/outreach/dialogs/EnrollSequenceDialog.js", () => ({
  EnrollSequenceDialog: () => null,
}));
vi.mock("@/components/outreach/dialogs/TakeoverDialog.js", () => ({
  TakeoverDialog: () => null,
}));

vi.mock("@/components/outreach/sequences/SequenceBuilder.js", async (importOriginal) => {
  const mod =
    await importOriginal<typeof import("@/components/outreach/sequences/SequenceBuilder.js")>();
  return {
    ...mod,
    SequenceBuilder: ({
      onUpdateStep,
    }: {
      readonly onUpdateStep: (idx: number, patch: { templateId?: string }) => void;
    }) => (
      <button
        type="button"
        data-testid="seq-mock-set-template"
        onClick={() => onUpdateStep(0, { templateId: "tpl-wa-1" })}
      >
        Setează template (test)
      </button>
    ),
  };
});

vi.mock("@/hooks/use-etapa2.js", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/hooks/use-etapa2.js")>();
  return {
    ...mod,
    useOutreachLead: vi.fn(mod.useOutreachLead),
    useLeadActivity: vi.fn(mod.useLeadActivity),
    useSendMessage: vi.fn(mod.useSendMessage),
    useCreateSequence: vi.fn(mod.useCreateSequence),
    useUpdateSequence: vi.fn(mod.useUpdateSequence),
    useOutreachSequence: vi.fn(mod.useOutreachSequence),
    useOutreachTemplates: vi.fn(mod.useOutreachTemplates),
    useCreateTemplate: vi.fn(mod.useCreateTemplate),
    useOutreachTemplate: vi.fn(mod.useOutreachTemplate),
    useUpdateTemplate: vi.fn(mod.useUpdateTemplate),
    useOutreachPhone: vi.fn(mod.useOutreachPhone),
    useOutreachLeads: vi.fn(mod.useOutreachLeads),
    usePhoneHealthCheck: vi.fn(mod.usePhoneHealthCheck),
  };
});

import {
  useCreateSequence,
  useCreateTemplate,
  useLeadActivity,
  useOutreachLead,
  useOutreachLeads,
  useOutreachPhone,
  useOutreachSequence,
  useOutreachTemplate,
  useOutreachTemplates,
  usePhoneHealthCheck,
  useSendMessage,
  useUpdateSequence,
  useUpdateTemplate,
} from "@/hooks/use-etapa2.js";
import { LeadDetail } from "@/pages/etapa2/lead-detail.js";
import { SequenceNew } from "@/pages/etapa2/sequence-new.js";
import { SequenceEdit } from "@/pages/etapa2/sequence-edit.js";
import { TemplateNew } from "@/pages/etapa2/template-new.js";
import { TemplateEdit } from "@/pages/etapa2/template-edit.js";
import { PhoneDetail } from "@/pages/etapa2/phone-detail.js";

function wrapRoute(initialEntry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/outreach/leads/:id" element={<LeadDetail />} />
          <Route path="/outreach/sequences/new" element={<SequenceNew />} />
          <Route path="/outreach/sequences/:id/edit" element={<SequenceEdit />} />
          <Route path="/outreach/templates/new" element={<TemplateNew />} />
          <Route path="/outreach/templates/:id/edit" element={<TemplateEdit />} />
          <Route path="/outreach/phones/:phoneId" element={<PhoneDetail />} />
          <Route path="/outreach/templates" element={<div data-testid="templates-list-stub" />} />
          <Route path="/outreach/sequences" element={<div data-testid="sequences-list-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const tplWa = {
  id: "tpl-wa-1",
  tenantId: "t1",
  name: "WA intro",
  description: null,
  channel: "WHATSAPP" as const,
  subject: null,
  bodyTemplate: "Hi",
  templateType: "INITIAL" as const,
  status: "ACTIVE" as const,
  variables: [] as string[],
  hasMedia: false,
  mediaType: null,
  mediaUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const baseLead = {
  id: "lead-1",
  tenantId: "t1",
  leadId: "lj-1",
  companyId: "c1",
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
    name: "Lead Enterprise SRL",
    cui: "RO1",
    judet: "AB",
    localitate: "Alba",
    telefon: null,
    email: null,
    whatsappNumber: null,
    contactName: null,
    website: null,
  },
};

const failedComm = {
  id: "comm-1",
  journeyId: "j1",
  tenantId: "t1",
  channel: "WHATSAPP" as const,
  direction: "OUTBOUND" as const,
  status: "FAILED" as const,
  contentPreview: "mesaj eșuat",
  externalMessageId: null,
  threadId: null,
  phoneId: null,
  quotaCost: 0,
  sentAt: null,
  deliveredAt: null,
  readAt: null,
  createdAt: "2026-01-02T00:00:00.000Z",
};

describe("LeadDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("loading: skeleton în pagină", () => {
    vi.mocked(useOutreachLead).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as never);
    vi.mocked(useLeadActivity).mockReturnValue({ data: { success: true, data: [] } } as never);
    vi.mocked(useSendMessage).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never);
    wrapRoute("/outreach/leads/lead-1");
    expect(screen.getByRole("heading", { name: /Detalii Lead/i })).toBeInTheDocument();
  });

  it("lead negăsit: mesaj și link înapoi", async () => {
    const user = userEvent.setup();
    vi.mocked(useOutreachLead).mockReturnValue({
      data: { success: true, data: undefined },
      isLoading: false,
    } as never);
    vi.mocked(useLeadActivity).mockReturnValue({ data: { success: true, data: [] } } as never);
    vi.mocked(useSendMessage).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never);
    wrapRoute("/outreach/leads/missing");
    expect(await screen.findByText(/Lead-ul nu a fost găsit/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Înapoi la liste/i }));
  });

  it("lead cu companie și Retrimite apelează useSendMessage", async () => {
    const user = userEvent.setup();
    const sendRetry = vi.fn().mockResolvedValue({});
    vi.mocked(useOutreachLead).mockReturnValue({
      data: {
        success: true,
        data: { ...baseLead, communications: [failedComm] },
      },
      isLoading: false,
    } as never);
    vi.mocked(useLeadActivity).mockReturnValue({
      data: {
        success: true,
        data: [{ timestamp: "2026-01-01T00:00:00.000Z", type: "NOTE", description: "x" }],
      },
    } as never);
    vi.mocked(useSendMessage).mockReturnValue({
      mutateAsync: sendRetry,
      isPending: false,
    } as never);
    wrapRoute("/outreach/leads/lead-1");
    expect(await screen.findByText(/Conversație \(1 mesaje\)/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Retrimite/i }));
    await waitFor(() => {
      expect(sendRetry).toHaveBeenCalledWith({
        id: "lead-1",
        payload: { channel: "WHATSAPP", content: "mesaj eșuat" },
      });
    });
  });
});

describe("SequenceNew / SequenceEdit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOutreachTemplates).mockReturnValue({
      data: { success: true, data: [tplWa] },
    } as never);
  });

  it("SequenceNew: după setare template, Creează Secvență apelează create", async () => {
    const user = userEvent.setup();
    const createMut = vi.fn().mockResolvedValue({ success: true, data: { id: "s1" } });
    vi.mocked(useCreateSequence).mockReturnValue({
      mutateAsync: createMut,
      isPending: false,
    } as never);
    wrapRoute("/outreach/sequences/new");
    await user.type(screen.getByPlaceholderText(/Agro Intro/i), "Secvență RTL");
    await user.click(screen.getByTestId("seq-mock-set-template"));
    await user.click(screen.getByRole("button", { name: /Creează Secvență/i }));
    await waitFor(() => {
      expect(createMut).toHaveBeenCalled();
    });
    const arg = createMut.mock.calls[0][0] as { name: string; steps: { templateId: string }[] };
    expect(arg.name).toBe("Secvență RTL");
    expect(arg.steps[0]?.templateId).toBe("tpl-wa-1");
  });

  it("SequenceEdit: Salvează apelează update cu pașii din secvență", async () => {
    const user = userEvent.setup();
    const updateMut = vi.fn().mockResolvedValue({ success: true, data: {} });
    vi.mocked(useOutreachSequence).mockReturnValue({
      data: {
        success: true,
        data: {
          id: "seq-1",
          tenantId: "t1",
          name: "Seq orig",
          description: null,
          isActive: true,
          stopOnReply: true,
          respectBusinessHours: true,
          totalEnrolled: 0,
          totalCompletions: 0,
          totalConversions: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          steps: [
            {
              id: "st1",
              sequenceId: "seq-1",
              stepNumber: 1,
              channel: "WHATSAPP" as const,
              templateId: "tpl-wa-1",
              delayHours: 0,
              delayMinutes: 0,
              subject: null,
            },
          ],
        },
      },
      isLoading: false,
    } as never);
    vi.mocked(useUpdateSequence).mockReturnValue({
      mutateAsync: updateMut,
      isPending: false,
    } as never);
    wrapRoute("/outreach/sequences/seq-1/edit");
    expect(await screen.findByDisplayValue("Seq orig")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Salvează/i }));
    await waitFor(() => {
      expect(updateMut).toHaveBeenCalled();
    });
    const call = updateMut.mock.calls[0][0] as {
      id: string;
      payload: { steps: { templateId: string }[] };
    };
    expect(call.id).toBe("seq-1");
    expect(call.payload.steps[0]?.templateId).toBe("tpl-wa-1");
  });

  it("SequenceEdit: secvență negăsită", async () => {
    vi.mocked(useOutreachSequence).mockReturnValue({
      data: { success: true, data: undefined },
      isLoading: false,
    } as never);
    vi.mocked(useUpdateSequence).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never);
    wrapRoute("/outreach/sequences/bad-id/edit");
    expect(await screen.findByText(/Nu am putut încărca secvența/i)).toBeInTheDocument();
  });
});

describe("TemplateNew / TemplateEdit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TemplateNew: Creează Template trimite payloadul", async () => {
    const user = userEvent.setup();
    const createMut = vi.fn().mockResolvedValue({ success: true, data: { id: "nt1" } });
    vi.mocked(useCreateTemplate).mockReturnValue({
      mutateAsync: createMut,
      isPending: false,
    } as never);
    wrapRoute("/outreach/templates/new");
    await user.type(screen.getByLabelText(/Nume \*/i), "Tpl RTL");
    const bodyEl = screen.getByPlaceholderText(/\{\{contact\}/i);
    fireEvent.change(bodyEl, { target: { value: "Salut {{nume}}" } });
    await user.click(screen.getByRole("button", { name: /Creează Template/i }));
    await waitFor(() => {
      expect(createMut).toHaveBeenCalled();
    });
    const arg = createMut.mock.calls[0][0] as {
      name: string;
      bodyTemplate: string;
      variables: string[];
    };
    expect(arg.name).toBe("Tpl RTL");
    expect(arg.bodyTemplate).toContain("{{nume}}");
    expect(arg.variables).toContain("nume");
  });

  it("TemplateEdit: Salvează apelează update", async () => {
    const user = userEvent.setup();
    const updateMut = vi.fn().mockResolvedValue({ success: true, data: {} });
    vi.mocked(useOutreachTemplate).mockReturnValue({
      data: {
        success: true,
        data: {
          ...tplWa,
          id: "tpl-edit-1",
          name: "Nume vechi",
          bodyTemplate: "Corp",
          status: "DRAFT" as const,
        },
      },
      isLoading: false,
    } as never);
    vi.mocked(useUpdateTemplate).mockReturnValue({
      mutateAsync: updateMut,
      isPending: false,
    } as never);
    wrapRoute("/outreach/templates/tpl-edit-1/edit");
    const nameInput = await screen.findByLabelText(/^Nume$/i);
    expect(nameInput).toHaveValue("Nume vechi");
    await user.clear(nameInput);
    await user.type(nameInput, "Nume nou");
    await user.click(screen.getByRole("button", { name: /^Salvează$/i }));
    await waitFor(() => {
      expect(updateMut).toHaveBeenCalled();
    });
    const arg = updateMut.mock.calls[0][0] as { id: string; payload: { name: string } };
    expect(arg.id).toBe("tpl-edit-1");
    expect(arg.payload.name).toBe("Nume nou");
  });
});

describe("PhoneDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const phone = {
    id: "ph-1",
    tenantId: "t1",
    phoneNumber: "+40700000000",
    label: "Linie RTL",
    timelinesaiPhoneId: null,
    status: "ACTIVE" as const,
    isEnabled: true,
    priority: 1,
    dailyQuotaLimit: 100,
    reputationScore: 80,
    lastHealthCheckAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    currentUsage: 5,
    quotaPercentage: 10,
    quotaHistory: [] as { usageDate: string; messagesSent: number }[],
    recentMessages: [] as {
      id: string;
      channel: string;
      direction: string;
      createdAt: string;
      contentPreview: string | null;
      status: string;
    }[],
  };

  it("loading", () => {
    vi.mocked(useOutreachPhone).mockReturnValue({ data: undefined, isLoading: true } as never);
    vi.mocked(useOutreachLeads).mockReturnValue({
      data: { success: true, data: [], meta: { total: 0, page: 1, limit: 50 } },
      isLoading: false,
    } as never);
    vi.mocked(usePhoneHealthCheck).mockReturnValue({
      mutateAsync: vi.fn(),
    } as never);
    wrapRoute("/outreach/phones/ph-1");
    expect(screen.getByRole("heading", { name: /Telefon/i })).toBeInTheDocument();
  });

  it("telefon negăsit", async () => {
    vi.mocked(useOutreachPhone).mockReturnValue({
      data: { success: true, data: undefined },
      isLoading: false,
    } as never);
    vi.mocked(useOutreachLeads).mockReturnValue({
      data: { success: true, data: [], meta: { total: 0, page: 1, limit: 50 } },
      isLoading: false,
    } as never);
    vi.mocked(usePhoneHealthCheck).mockReturnValue({
      mutateAsync: vi.fn(),
    } as never);
    wrapRoute("/outreach/phones/x");
    expect(await screen.findByText(/Telefonul nu există/i)).toBeInTheDocument();
  });

  it("Health check apelează mutația", async () => {
    const user = userEvent.setup();
    const health = vi.fn().mockResolvedValue({});
    vi.mocked(useOutreachPhone).mockReturnValue({
      data: { success: true, data: phone },
      isLoading: false,
    } as never);
    vi.mocked(useOutreachLeads).mockReturnValue({
      data: { success: true, data: [], meta: { total: 0, page: 1, limit: 50 } },
      isLoading: false,
    } as never);
    vi.mocked(usePhoneHealthCheck).mockReturnValue({
      mutateAsync: health,
    } as never);
    wrapRoute("/outreach/phones/ph-1");
    expect(await screen.findByRole("heading", { name: "Linie RTL" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Health check/i }));
    await waitFor(() => {
      expect(health).toHaveBeenCalledWith("ph-1");
    });
  });
});
