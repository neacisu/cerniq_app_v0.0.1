/**
 * RBAC: tab Control în inspector — doar admin-like poate pune pauză / config (aliniat la API requireRole admin).
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/providers/auth-provider.js", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "u1", email: "v@t.c", role: "viewer", tenantId: "t1" },
    token: "t",
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    setAuth: vi.fn(),
    getAuthHeader: vi.fn(() => ({})),
  })),
}));

vi.mock("@/hooks/use-cognitive-brain.js", () => ({
  useNeuronInspector: () => ({ traces: [], mutations: [], isLoading: false, error: null }),
  useNeuronControl: () => ({
    pause: vi.fn(),
    resume: vi.fn(),
    updateConfig: vi.fn(),
    isPausing: false,
    isResuming: false,
    isUpdatingConfig: false,
    pauseError: null,
    resumeError: null,
    configError: null,
    optimisticPaused: null,
    configResult: null,
    lastPauseResult: null,
    lastResumeResult: null,
  }),
}));

import { useAuth } from "@/providers/auth-provider.js";
import { NeuronInspectorPanel } from "@/components/cognitive/NeuronInspectorPanel.js";

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("NeuronInspectorPanel — Control tab RBAC", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u1", email: "v@t.c", role: "viewer", tenantId: "t1" },
      token: "t",
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
      getAuthHeader: vi.fn(() => ({})),
    });
  });

  it("viewer: tab Control afișează mesaj, fără butoane Pauză/Reluare", async () => {
    const user = userEvent.setup();
    wrap(<NeuronInspectorPanel selectedNodeKey="e1.import.parse" onClose={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Control/i }));
    expect(screen.getByTestId("neuron-controls-rbac-deny")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Pauză$/ })).not.toBeInTheDocument();
  });

  it("admin: tab Control afișează acțiuni de pauză", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "a1", email: "a@t.c", role: "admin", tenantId: "t1" },
      token: "t",
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
      getAuthHeader: vi.fn(() => ({})),
    });
    const user = userEvent.setup();
    wrap(<NeuronInspectorPanel selectedNodeKey="e1.import.parse" onClose={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Control/i }));
    expect(screen.getByRole("button", { name: /^Pauză$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Reluare$/ })).toBeInTheDocument();
  });
});
