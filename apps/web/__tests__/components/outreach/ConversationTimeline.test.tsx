import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConversationTimeline } from "@/components/outreach/conversation/ConversationTimeline.js";
import type { CommunicationLog } from "@/lib/etapa2-api.js";

const base = (over: Partial<CommunicationLog> = {}): CommunicationLog => ({
  id: "m1",
  journeyId: "j",
  tenantId: "t",
  channel: "WHATSAPP",
  direction: "OUTBOUND",
  status: "SENT",
  contentPreview: "Salut",
  externalMessageId: null,
  threadId: null,
  phoneId: null,
  quotaCost: 0,
  sentAt: null,
  deliveredAt: null,
  readAt: null,
  createdAt: "2026-03-10T12:00:00.000Z",
  ...over,
});

describe("ConversationTimeline", () => {
  it("loading: skeleton", () => {
    render(<ConversationTimeline messages={[]} isLoading />);
    expect(document.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("gol: mesaj empty state", () => {
    render(<ConversationTimeline messages={[]} />);
    expect(screen.getByText(/Nicio comunicare înregistrată/i)).toBeInTheDocument();
  });

  it("afișează mesaje și separator de dată când ziua se schimbă", () => {
    const scroll = vi
      .spyOn(Element.prototype, "scrollIntoView")
      .mockImplementation(() => undefined);
    const messages = [
      base({ id: "a", contentPreview: "Prima", createdAt: "2026-03-09T10:00:00.000Z" }),
      base({ id: "b", contentPreview: "A doua", createdAt: "2026-03-10T11:00:00.000Z" }),
    ];
    render(<ConversationTimeline messages={messages} autoScroll />);
    expect(screen.getByText("Prima")).toBeInTheDocument();
    expect(screen.getByText("A doua")).toBeInTheDocument();
    expect(screen.getByText("09 martie 2026")).toBeInTheDocument();
    expect(screen.getByText("10 martie 2026")).toBeInTheDocument();
    scroll.mockRestore();
  });
});
