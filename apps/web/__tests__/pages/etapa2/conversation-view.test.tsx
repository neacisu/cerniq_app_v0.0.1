/**
 * conversation-view: timeline din `lead.communications` (GET lead), nu date statice UI.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import React from "react";

const timelineMessages: unknown[] = [];

vi.mock("@/hooks/use-etapa2.js", () => ({
  useOutreachLead: (_id: string | undefined) => ({
    data: {
      data: {
        company: { name: "Firma Test" },
        communications: [
          { id: "m1", direction: "INBOUND", body: "Salut", createdAt: "2026-01-01T10:00:00Z" },
        ],
      },
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

vi.mock("@/components/outreach/conversation/ConversationTimeline.js", () => ({
  ConversationTimeline: (props: { messages: unknown[] }) => {
    timelineMessages.length = 0;
    timelineMessages.push(...props.messages);
    return <div data-testid="conversation-timeline" />;
  },
}));

vi.mock("@/components/outreach/conversation/ConversationMessageBar.js", () => ({
  ConversationMessageBar: () => <div data-testid="message-bar" />,
}));

import { ConversationView } from "@/pages/etapa2/conversation-view.js";

describe("ConversationView", () => {
  beforeEach(() => {
    timelineMessages.length = 0;
  });

  it("trimite communications de la lead către ConversationTimeline", () => {
    render(
      <MemoryRouter initialEntries={["/outreach/leads/lead-uuid/conversation"]}>
        <Routes>
          <Route path="/outreach/leads/:id/conversation" element={<ConversationView />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(timelineMessages).toHaveLength(1);
    expect(timelineMessages[0]).toMatchObject({ id: "m1", direction: "INBOUND" });
  });
});
