/**
 * NeuronInspectorPanel — catalog static (@cerniq/shared) vs hook-uri date (mock).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { getNodeByKey } from "@cerniq/shared";

vi.mock("@/providers/auth-provider.js", () => ({
  useAuth: () => ({ user: { role: "admin", id: "test-user" } }),
}));

vi.mock("@/hooks/use-cognitive-brain.js", () => ({
  useNeuronInspector: vi.fn(),
  useNeuronControl: vi.fn(),
}));

import { useNeuronControl, useNeuronInspector } from "@/hooks/use-cognitive-brain.js";
import { NeuronInspectorPanel } from "@/components/cognitive/NeuronInspectorPanel.js";

const SAMPLE_NODE_KEY = "e3:product:ingest";

function mockControl() {
  return {
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
  };
}

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("NeuronInspectorPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNeuronInspector).mockReturnValue({
      traces: [],
      mutations: [],
      isLoading: false,
      error: null,
    });
    vi.mocked(useNeuronControl).mockReturnValue(
      mockControl() as ReturnType<typeof useNeuronControl>,
    );
  });

  it("fără nod selectat: empty state (catalog vs API separat)", () => {
    wrap(<NeuronInspectorPanel selectedNodeKey={null} onClose={vi.fn()} />);
    expect(screen.getByTestId("neuron-inspector-panel")).toBeInTheDocument();
    expect(screen.getByTestId("inspector-empty-state")).toBeInTheDocument();
  });

  it("cu nod selectat: afișează nodeKey + cognitiveFunction din COGNITIVE_NODE_CATALOG", async () => {
    const entry = getNodeByKey(SAMPLE_NODE_KEY);
    expect(entry, "fixture catalog").toBeDefined();
    const onClose = vi.fn();
    wrap(
      <NeuronInspectorPanel
        selectedNodeKey={SAMPLE_NODE_KEY}
        onClose={onClose}
        batchId="batch-rtl"
      />,
    );
    expect(await screen.findByText(SAMPLE_NODE_KEY)).toBeInTheDocument();
    if (entry?.cognitiveFunction) {
      expect(screen.getByText(entry.cognitiveFunction)).toBeInTheDocument();
    }
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Închide inspector/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("tab Traces: mesaj gol când traces=[] din hook (fără apel API real)", async () => {
    wrap(<NeuronInspectorPanel selectedNodeKey={SAMPLE_NODE_KEY} onClose={vi.fn()} />);
    expect(await screen.findByTestId("traces-empty")).toBeInTheDocument();
  });
});
