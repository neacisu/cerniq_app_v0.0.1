/**
 * RTL dedicat paginilor E5: Churn, Nurturing (retention), Referrals KOL.
 * Date: MSW din `test-utils/msw/handlers.ts` (nurturing/states, churn/factors+stats, graph, referrals).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@xyflow/react", () => ({
  ReactFlow: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "react-flow" }, children),
  Background: () => React.createElement("div", { "data-testid": "rf-background" }),
  Controls: () => React.createElement("div", { "data-testid": "rf-controls" }),
  MiniMap: () => React.createElement("div", { "data-testid": "rf-minimap" }),
  Handle: ({ type, position }: { type: string; position: string }) =>
    React.createElement("div", { "data-handle-type": type, "data-handle-position": position }),
  Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
  BackgroundVariant: { Dots: "dots", Lines: "lines", Cross: "cross" },
  useNodesState: () => [[], vi.fn()],
  useEdgesState: () => [[], vi.fn()],
  ReactFlowProvider: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
}));

import { Churn } from "@/pages/etapa5/churn.js";
import { Nurturing } from "@/pages/etapa5/nurturing.js";
import { Referrals } from "@/pages/etapa5/referrals.js";

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderChurn() {
  const client = makeClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Churn />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderNurturing(initialPath = "/nurturing") {
  const client = makeClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/nurturing" element={<Nurturing />} />
          <Route
            path="/nurturing/dashboard"
            element={<div data-testid="nurturing-dashboard-route">Dashboard wired</div>}
          />
          <Route path="/churn" element={<div data-testid="churn-route-marker">Churn route</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderReferrals() {
  const client = makeClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Referrals />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("E5 Churn page (RTL + MSW)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title and KPI labels from real API contract", async () => {
    renderChurn();
    expect(screen.getByRole("heading", { name: /Churn Risk/i })).toBeInTheDocument();
    expect(screen.getByText(/Profiluri churn \(DB\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Risc CRITICAL \(stats\)/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Cooperativa Test")).toBeInTheDocument();
    });
  });

  it("lists factor rows with risk labels from MSW payload", async () => {
    renderChurn();
    await waitFor(() => {
      expect(screen.getByText("SC Agro Mid SRL")).toBeInTheDocument();
      expect(screen.getByText("OUAI Demo")).toBeInTheDocument();
    });
    expect(screen.getAllByText(/HIGH|MEDIUM|LOW/).length).toBeGreaterThan(0);
  });

  it("opens detail drawer from Profil and shows evaluate action", async () => {
    const user = userEvent.setup();
    renderChurn();
    await waitFor(() => expect(screen.getByText("Cooperativa Test")).toBeInTheDocument());
    const profilButtons = screen.getAllByRole("button", { name: /^Profil$/i });
    expect(profilButtons.length).toBeGreaterThan(0);
    const firstProfil = profilButtons[0];
    expect(firstProfil).toBeDefined();
    await user.click(firstProfil);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Evaluează churn \(worker\)/i }),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/POST/i)).toBeInTheDocument();
    expect(screen.getByText(/\/api\/v1\/churn/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Închide$/i }));
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /Evaluează churn \(worker\)/i }),
      ).not.toBeInTheDocument();
    });
  });
});

describe("E5 Nurturing retention page (RTL + MSW)", () => {
  it("renders table with FSM state and company from gold_nurturing_state", async () => {
    renderNurturing();
    expect(
      screen.getByRole("heading", { name: /Retention — Monitorizare Clienți/i }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("SC Demo Farm SRL")).toBeInTheDocument();
    });
    expect(screen.getByText("NURTURING_ACTIVE")).toBeInTheDocument();
    expect(screen.getByText(/Stări nurturing/i)).toBeInTheDocument();
  });

  it("navigates to dashboard route when clicking Dashboard Complet", async () => {
    const user = userEvent.setup();
    renderNurturing();
    await waitFor(() => expect(screen.getByText("SC Demo Farm SRL")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Dashboard Complet/i }));
    await waitFor(() => {
      expect(screen.getByTestId("nurturing-dashboard-route")).toBeInTheDocument();
    });
  });

  it("shows KPI meta total from API list response", async () => {
    renderNurturing();
    await waitFor(() => {
      const labelEl = screen.getByText(/Total DB \(meta\)/i);
      expect(labelEl.previousElementSibling?.textContent?.trim()).toBe("1");
    });
  });
});

describe("E5 Referrals KOL page (RTL + MSW)", () => {
  it("renders KPI cards backed by graph + referrals meta", async () => {
    renderReferrals();
    expect(screen.getByRole("heading", { name: /Referrals KOL/i })).toBeInTheDocument();
    expect(screen.getByText(/Clustere cu KOL/i)).toBeInTheDocument();
    expect(screen.getByText(/Referral-uri \(DB\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Convertite \(DB\)/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("SC KOL Alpha SRL")).toBeInTheDocument();
      expect(screen.getByText("SC KOL Beta SRL")).toBeInTheDocument();
    });
  });

  it("renders ReactFlow after kol-profiles load", async () => {
    renderReferrals();
    await waitFor(() => {
      expect(screen.getByTestId("react-flow")).toBeInTheDocument();
    });
  });

  it("shows referral conversion summary when referrals exist", async () => {
    renderReferrals();
    await waitFor(() => {
      expect(screen.getByText(/Referral convertite:/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/2 din 5/i)).toBeInTheDocument();
  });
});
