/**
 * Tests for NeuronInspectorPanel — right rail inspector with tabs
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NeuronInspectorPanel } from "@/components/cognitive/NeuronInspectorPanel.js";

vi.mock("@/providers/auth-provider.js", () => ({
  useAuth: () => ({ user: { role: "admin", id: "test-user" } }),
}));

vi.mock("@xyflow/react", () => ({}));
vi.mock("@/lib/api-url.js", () => ({ getApiBase: () => "http://127.0.0.1:64010" }));
vi.mock("@/lib/api.js", () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({
      success: true,
      nodeKey: "e1:csv:parse",
      status: "PAUSED",
      propagated: false,
      batchId: null,
    }),
    put: vi.fn().mockResolvedValue({
      success: true,
      data: {},
      meta: { applyStatus: "immediate", requiresWorkerRestart: false },
    }),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(msg: string, status = 500) {
      super(msg);
      this.status = status;
    }
  },
}));

// ─── Hoisted mock functions for useNeuronControl ──────────────────────────────

const { mockPause, mockResume, mockUpdateConfig } = vi.hoisted(() => ({
  mockPause: vi.fn(),
  mockResume: vi.fn(),
  mockUpdateConfig: vi.fn(),
}));

vi.mock("@/hooks/use-cognitive-brain.js", () => ({
  useNeuronInspector: () => ({
    traces: [],
    mutations: [],
    isLoading: false,
    error: null,
  }),
  useNeuronControl: () => ({
    pause: mockPause,
    resume: mockResume,
    updateConfig: mockUpdateConfig,
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

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPanel(selectedNodeKey: string | null, onClose = vi.fn(), batchId?: string) {
  const qc = makeQC();
  return render(
    <QueryClientProvider client={qc}>
      <NeuronInspectorPanel selectedNodeKey={selectedNodeKey} onClose={onClose} batchId={batchId} />
    </QueryClientProvider>,
  );
}

describe("NeuronInspectorPanel", () => {
  beforeEach(() => {
    mockPause.mockClear();
    mockResume.mockClear();
    mockUpdateConfig.mockClear();
  });

  describe("empty state (no node selected)", () => {
    it("renders with data-testid", () => {
      renderPanel(null);
      expect(screen.getByTestId("neuron-inspector-panel")).toBeInTheDocument();
    });

    it("shows empty state message", () => {
      renderPanel(null);
      expect(screen.getByTestId("inspector-empty-state")).toBeInTheDocument();
      expect(
        screen.getByText("Selectați un neuron din canvas pentru a inspecta"),
      ).toBeInTheDocument();
    });

    it("does not show tab bar when no node selected", () => {
      renderPanel(null);
      expect(screen.queryByText("Traces")).not.toBeInTheDocument();
    });
  });

  describe("with node selected", () => {
    it("shows tab bar with all tabs", () => {
      renderPanel("e1:csv:parse");
      expect(screen.getByText("Traces")).toBeInTheDocument();
      expect(screen.getByText("Mutații")).toBeInTheDocument();
      expect(screen.getByText("Metrici")).toBeInTheDocument();
      expect(screen.getByText("Control")).toBeInTheDocument();
    });

    it("shows nodeKey in header", () => {
      renderPanel("e1:csv:parse");
      expect(screen.getByText("e1:csv:parse")).toBeInTheDocument();
    });

    it("shows catalog cognitiveFunction when available", () => {
      renderPanel("e1:csv:parse");
      expect(screen.getByTestId("neuron-inspector-panel")).toBeInTheDocument();
    });

    it("calls onClose when close button is clicked", () => {
      const onClose = vi.fn();
      renderPanel("e1:csv:parse", onClose);
      fireEvent.click(screen.getByLabelText("Închide inspector"));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("switches to Mutations tab on click", () => {
      renderPanel("e1:csv:parse");
      fireEvent.click(screen.getByText("Mutații"));
      expect(screen.getByText("Nicio mutație înregistrată")).toBeInTheDocument();
    });

    it("switches to Metrici tab on click", () => {
      renderPanel("e1:csv:parse");
      fireEvent.click(screen.getByText("Metrici"));
      expect(screen.getAllByTestId("metrics-sparkline").length).toBeGreaterThanOrEqual(1);
    });

    it("switches to Control tab on click", () => {
      renderPanel("e1:csv:parse");
      fireEvent.click(screen.getByText("Control"));
      expect(screen.getByText("Pauză")).toBeInTheDocument();
      expect(screen.getByText("Reluare")).toBeInTheDocument();
    });

    it("shows empty traces message by default when traces = []", () => {
      renderPanel("e1:csv:parse");
      expect(screen.getByText("Niciun trace înregistrat")).toBeInTheDocument();
    });

    it("calls control.pause when Pauză is clicked", () => {
      renderPanel("e1:csv:parse");
      fireEvent.click(screen.getByText("Control"));
      fireEvent.click(screen.getByText("Pauză"));
      expect(mockPause).toHaveBeenCalledOnce();
    });

    it("calls control.resume when Reluare is clicked", () => {
      renderPanel("e1:csv:parse");
      fireEvent.click(screen.getByText("Control"));
      fireEvent.click(screen.getByText("Reluare"));
      expect(mockResume).toHaveBeenCalledOnce();
    });

    it("calls control.updateConfig when 'Aplică configurare' is clicked", () => {
      renderPanel("e1:csv:parse");
      fireEvent.click(screen.getByText("Control"));
      fireEvent.click(screen.getByText("Aplică configurare"));
      expect(mockUpdateConfig).toHaveBeenCalledOnce();
    });

    it("passes concurrency to updateConfig when filled", () => {
      renderPanel("e1:csv:parse");
      fireEvent.click(screen.getByText("Control"));
      const concurrencyInput = screen.getByPlaceholderText("ex: 5");
      fireEvent.change(concurrencyInput, { target: { value: "8" } });
      fireEvent.click(screen.getByText("Aplică configurare"));
      expect(mockUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({ concurrency: 8 }));
    });

    it("accepts batchId prop without crashing", () => {
      renderPanel("e1:csv:parse", vi.fn(), "batch-123");
      expect(screen.getByTestId("neuron-inspector-panel")).toBeInTheDocument();
    });
  });
});
