/**
 * header.test.tsx — Teste complete pentru componenta Header
 * Acoperire: breadcrumb, notificări (badge + dropdown + click), navigare,
 *            Settings button, avatar, edge cases (unread=0, unread=99+, etc.)
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header.js";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockToken = "test-token-123";
vi.mock("@/providers/auth-provider.js", () => ({
  useAuth: () => ({ token: mockToken }),
}));

const mockMutateAsync = vi.fn().mockResolvedValue({});

vi.mock("@/hooks/use-etapa2.js", () => ({
  useOutreachNotifications: vi.fn(),
  useMarkNotificationRead: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

import { useOutreachNotifications } from "@/hooks/use-etapa2.js";
const mockUseNotifications = vi.mocked(useOutreachNotifications);

// ─── Test helpers ─────────────────────────────────────────────────────────────

type MockQueryResult = ReturnType<typeof useOutreachNotifications>;

function makeNotification(
  overrides: Partial<{
    id: string;
    title: string;
    body: string | null;
    resourceType: string | null;
    resourceId: string | null;
    isRead: boolean;
  }> = {},
) {
  const defaults = {
    id: "notif-1",
    tenantId: "tenant-1",
    userId: null,
    type: "system",
    title: "Test notification",
    body: "Body text" as string | null,
    resourceType: "lead_journey" as string | null,
    resourceId: "lead-123" as string | null,
    isRead: false,
    createdAt: "2026-01-01T00:00:00Z",
  };
  return { ...defaults, ...overrides };
}

function setNotifMock(unreadCount: number, items: ReturnType<typeof makeNotification>[]) {
  mockUseNotifications.mockReturnValue({
    data: { success: true, data: { unreadCount, items } },
  } as unknown as MockQueryResult);
}

function renderHeader(pathname = "/dashboard") {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[pathname]}>
        <Header />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

describe("Header — breadcrumb", () => {
  beforeEach(() => {
    setNotifMock(0, []);
  });

  it("renders 'cerniq.app' brand text", () => {
    renderHeader("/dashboard");
    expect(screen.getByText("cerniq.app")).toBeInTheDocument();
  });

  it("renders '>' separator ca text (nu entitate HTML)", () => {
    renderHeader("/dashboard");
    const sep = screen.getByText(">");
    expect(sep).toBeInTheDocument();
    expect(sep.textContent).toBe(">");
  });

  it("renders current page din ultimul segment de path", () => {
    renderHeader("/outreach/leads");
    expect(screen.getByText("leads")).toBeInTheDocument();
  });

  it("înlocuiește cratimele cu spații în numele paginii", () => {
    renderHeader("/outreach/lead-details");
    expect(screen.getByText("lead details")).toBeInTheDocument();
  });

  it("default 'dashboard' la path root /", () => {
    renderHeader("/");
    expect(screen.getByText("dashboard")).toBeInTheDocument();
  });

  it("path adânc — afișează ultimul segment", () => {
    renderHeader("/admin/settings/notifications");
    expect(screen.getByText("notifications")).toBeInTheDocument();
  });
});

// ─── Bell / Notifications — fără unread ──────────────────────────────────────

describe("Header — notificări (unread=0)", () => {
  beforeEach(() => {
    setNotifMock(0, []);
  });

  it("renderizează butonul Bell", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: /notificari/i })).toBeInTheDocument();
  });

  it("NU afișează badge când unread=0", () => {
    renderHeader();
    expect(screen.queryByText(/^\d+\+?$/)).not.toBeInTheDocument();
  });

  it("NU afișează dropdown-ul de notificări când unread=0", () => {
    renderHeader();
    expect(screen.queryByText(/necitite/i)).not.toBeInTheDocument();
  });

  it("butonul Bell navighează la /outreach/leads", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: /notificari/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/outreach/leads");
  });
});

// ─── Bell / Notifications — cu unread ────────────────────────────────────────

describe("Header — notificări (unread>0)", () => {
  const notif1 = makeNotification({ id: "n1", title: "Lead raspuns", body: "Buna ziua!" });
  const notif2 = makeNotification({
    id: "n2",
    title: "Alt notif",
    body: null,
    resourceType: "other",
    resourceId: null,
  });

  beforeEach(() => {
    mockMutateAsync.mockResolvedValue({});
    setNotifMock(2, [notif1, notif2]);
  });

  it("afișează badge cu numărul corect", () => {
    renderHeader();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("afișează dropdown-ul cu textul unread count", () => {
    renderHeader();
    expect(screen.getByText("Notificări necitite (2)")).toBeInTheDocument();
  });

  it("afișează titlul notificărilor în dropdown", () => {
    renderHeader();
    expect(screen.getByText("Lead raspuns")).toBeInTheDocument();
  });

  it("afișează body-ul notificării când există", () => {
    renderHeader();
    expect(screen.getByText("Buna ziua!")).toBeInTheDocument();
  });

  it("afișează titlul și când body este null", () => {
    renderHeader();
    expect(screen.getByText("Alt notif")).toBeInTheDocument();
  });
});

// ─── Badge — edge cases ───────────────────────────────────────────────────────

describe("Header — notification badge edge cases", () => {
  it("arată '99+' când unread > 99", () => {
    setNotifMock(150, [makeNotification()]);
    renderHeader();
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("arată '99' exact când unread = 99", () => {
    setNotifMock(99, [makeNotification()]);
    renderHeader();
    expect(screen.getByText("99")).toBeInTheDocument();
  });

  it("arată '1' când unread=1", () => {
    setNotifMock(1, [makeNotification()]);
    renderHeader();
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});

// ─── Click pe notificare — markRead + navigate ────────────────────────────────

describe("Header — comportament la click pe notificare", () => {
  const notifLead = makeNotification({
    id: "lead-notif-1",
    title: "Notif lead",
    body: null,
    resourceType: "lead_journey",
    resourceId: "journey-abc",
  });

  const notifOther = makeNotification({
    id: "other-notif-1",
    title: "Notif other",
    body: null,
    resourceType: "system",
    resourceId: null,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({});
  });

  it("apelează markRead.mutateAsync cu id-ul notificării", async () => {
    setNotifMock(1, [notifLead]);
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Notif lead" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith("lead-notif-1");
    });
  });

  it("navighează la pagina lead când resourceType='lead_journey' și resourceId prezent", async () => {
    setNotifMock(1, [notifLead]);
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Notif lead" }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/outreach/leads/journey-abc");
    });
  });

  it("NU navighează la lead când resourceType nu este 'lead_journey'", async () => {
    setNotifMock(1, [notifOther]);
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Notif other" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith("other-notif-1");
    });
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining("/outreach/leads/"));
  });

  it("NU navighează când resourceId este null chiar dacă resourceType='lead_journey'", async () => {
    const notifNoId = makeNotification({
      id: "no-id-notif",
      title: "No id notif",
      body: null,
      resourceType: "lead_journey",
      resourceId: null,
    });

    setNotifMock(1, [notifNoId]);
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "No id notif" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith("no-id-notif");
    });
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining("/outreach/leads/"));
  });
});

// ─── Dropdown list — max 8 items ──────────────────────────────────────────────

describe("Header — lista dropdown (max 8)", () => {
  it("afișează maximum 8 notificări când sunt mai multe", () => {
    const manyNotifs = Array.from({ length: 15 }, (_, i) =>
      makeNotification({ id: `n${i}`, title: `Notif ${i}` }),
    );

    setNotifMock(15, manyNotifs);
    renderHeader();

    for (let i = 0; i < 8; i++) {
      expect(screen.getByText(`Notif ${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByText("Notif 8")).not.toBeInTheDocument();
    expect(screen.queryByText("Notif 14")).not.toBeInTheDocument();
  });
});

// ─── Settings button ──────────────────────────────────────────────────────────

describe("Header — butonul Settings", () => {
  beforeEach(() => {
    setNotifMock(0, []);
  });

  it("renderizează butonul Settings cu aria-label", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
  });

  it("navighează la /settings la click", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(mockNavigate).toHaveBeenCalledWith("/settings");
  });
});

// ─── User avatar ──────────────────────────────────────────────────────────────

describe("Header — user avatar", () => {
  beforeEach(() => {
    setNotifMock(0, []);
  });

  it("renderizează containerul avatar (.av)", () => {
    const { container } = renderHeader();
    expect(container.querySelector(".av")).toBeInTheDocument();
  });
});

// ─── Guard null/undefined ─────────────────────────────────────────────────────

describe("Header — guard null/undefined data", () => {
  it("nu crează eroare când notifResp este undefined", () => {
    mockUseNotifications.mockReturnValue({
      data: undefined,
    } as unknown as MockQueryResult);
    expect(() => renderHeader()).not.toThrow();
  });

  it("arată unread=0 (badge ascuns) când data este undefined", () => {
    mockUseNotifications.mockReturnValue({
      data: undefined,
    } as unknown as MockQueryResult);
    renderHeader();
    expect(screen.queryByText(/^99\+$|^\d+$/)).not.toBeInTheDocument();
  });
});

// ─── Conformitate JSX / accesibilitate ────────────────────────────────────────

describe("Header — conformitate JSX/a11y", () => {
  beforeEach(() => {
    setNotifMock(3, [makeNotification()]);
  });

  it("butonul Bell are aria-label (accesibilitate)", () => {
    renderHeader();
    const bell = screen.getByRole("button", { name: /notificari/i });
    expect(bell).toHaveAttribute("aria-label");
    expect(bell).toHaveAttribute("type", "button");
  });

  it("butonul Settings are aria-label (accesibilitate)", () => {
    renderHeader();
    const settings = screen.getByRole("button", { name: "Settings" });
    expect(settings).toHaveAttribute("aria-label", "Settings");
    expect(settings).toHaveAttribute("type", "button");
  });

  it("separatorul breadcrumb renderizează '>' (NU entitate &gt;)", () => {
    renderHeader();
    const sep = document.querySelector(".t4");
    expect(sep?.textContent).toBe(">");
  });

  it("toate butoanele au type='button' (previne submit accidental)", () => {
    renderHeader();
    const notifButtons = screen.getAllByRole("button");
    for (const btn of notifButtons) {
      expect(btn).toHaveAttribute("type", "button");
    }
  });
});
