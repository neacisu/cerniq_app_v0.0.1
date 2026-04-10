/**
 * Bară mesaje conversație: canale, trimitere, toast-uri, template picker.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast as sonnerToast } from "sonner";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConversationMessageBar } from "@/components/outreach/conversation/ConversationMessageBar.js";
import type { OutreachLead } from "@/lib/etapa2-api.js";

const mutateAsync = vi.fn().mockResolvedValue({});

vi.mock("@/hooks/use-etapa2.js", () => ({
  useOutreachTemplates: () => ({
    data: {
      success: true,
      data: [
        {
          id: "tpl1",
          tenantId: "t",
          name: "Bun venit",
          description: null,
          channel: "WHATSAPP",
          subject: null,
          bodyTemplate: "Salut din template",
          templateType: "INITIAL",
          status: "ACTIVE",
          variables: [],
          hasMedia: false,
          mediaType: null,
          mediaUrl: null,
          createdAt: "",
          updatedAt: "",
        },
      ],
    },
  }),
  useSendMessage: () => ({ mutateAsync, isPending: false }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function leadBase(over: Partial<OutreachLead> = {}): OutreachLead {
  return {
    id: "lj1",
    tenantId: "ten",
    leadId: "lead-1",
    companyId: "co",
    currentState: "COLD",
    previousState: null,
    stateChangedAt: new Date().toISOString(),
    channel: null,
    lastChannelUsed: "WHATSAPP",
    assignedPhoneId: null,
    isHumanControlled: true,
    requiresHumanReview: false,
    nextActionAt: null,
    sentimentScore: null,
    intent: null,
    engagementScore: null,
    lastContactAt: null,
    assignedToUser: null,
    createdAt: "",
    updatedAt: "",
    ...over,
  };
}

describe("ConversationMessageBar", () => {
  beforeEach(() => {
    mutateAsync.mockClear();
    vi.mocked(sonnerToast.error).mockClear();
    vi.mocked(sonnerToast.success).mockClear();
  });

  it("afisează avertisment când lead nu e control uman", () => {
    render(<ConversationMessageBar leadId="L1" lead={leadBase({ isHumanControlled: false })} />);
    expect(screen.getByText(/Lead fără control uman/)).toBeInTheDocument();
  });

  it("Trimite e dezactivat fără conținut (nu se poate declanșa trimiterea goală)", () => {
    render(<ConversationMessageBar leadId="L1" lead={leadBase()} />);
    expect(screen.getByRole("button", { name: /^Trimite$/ })).toBeDisabled();
  });

  it("eroare la eșec API (mutateAsync respinge)", async () => {
    mutateAsync.mockRejectedValueOnce(new Error("net"));
    const user = userEvent.setup();
    render(<ConversationMessageBar leadId="L1" lead={leadBase()} />);
    await user.type(screen.getByPlaceholderText(/Scrie mesajul/i), "x");
    await user.click(screen.getByRole("button", { name: /^Trimite$/ }));
    await vi.waitFor(() => {
      expect(sonnerToast.error).toHaveBeenCalledWith("Eroare la trimiterea mesajului");
    });
  });

  it("trimite mesaj WhatsApp cu succes", async () => {
    const user = userEvent.setup();
    render(<ConversationMessageBar leadId="L1" lead={leadBase()} />);
    await user.type(screen.getByPlaceholderText(/Scrie mesajul/i), "Salut");
    await user.click(screen.getByRole("button", { name: /^Trimite$/ }));
    await vi.waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        id: "L1",
        payload: {
          channel: "WHATSAPP",
          content: "Salut",
          scheduledAt: undefined,
        },
      });
    });
    expect(sonnerToast.success).toHaveBeenCalledWith("Mesaj trimis");
  });

  it("EMAIL_WARM: câmp subiect și payload cu subject", async () => {
    const user = userEvent.setup();
    render(
      <ConversationMessageBar leadId="L2" lead={leadBase({ lastChannelUsed: "EMAIL_COLD" })} />,
    );
    await user.click(screen.getByRole("button", { name: /Email cald/i }));
    await user.type(screen.getByPlaceholderText(/Subiect email/i), "Sub");
    await user.type(screen.getByPlaceholderText(/Scrie mesajul/i), "Corp");
    await user.click(screen.getByRole("button", { name: /^Trimite$/ }));
    await vi.waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            channel: "EMAIL_WARM",
            subject: "Sub",
            content: "Corp",
          }),
        }),
      );
    });
  });

  it("Template: inserează bodyTemplate din listă", async () => {
    const user = userEvent.setup();
    render(<ConversationMessageBar leadId="L1" lead={leadBase()} />);
    await user.click(screen.getByRole("button", { name: /^Template$/ }));
    await user.click(screen.getByRole("button", { name: /Bun venit/i }));
    expect(screen.getByPlaceholderText(/Scrie mesajul/i)).toHaveValue("Salut din template");
  });
});
