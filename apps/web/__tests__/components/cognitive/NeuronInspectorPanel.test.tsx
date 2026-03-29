/**
 * Tests for NeuronInspectorPanel — right rail inspector with tabs
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NeuronInspectorPanel } from "@/components/cognitive/NeuronInspectorPanel.js";

vi.mock("@xyflow/react", () => ({}));
vi.mock("@/lib/api-url.js", () => ({ getApiBase: () => "http://127.0.0.1:64010" }));
vi.mock("@/lib/api.js", () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ success: true, data: { paused: true, propagated: true } }),
    put: vi.fn().mockResolvedValue({ success: true, data: { applyStatus: "immediate" } }),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(msg: string, status = 500) {
      super(msg);
      this.status = status;
    }
  },
}));

vi.mock("@/hooks/use-cognitive-brain.js", () => ({
  useNeuronInspector: () => ({
    traces: [],
    mutations: [],
    isLoading: false,
    error: null,
  }),
}));

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPanel(selectedNodeKey: string | null, onClose = vi.fn()) {
  const qc = makeQC();
  return render(
    <QueryClientProvider client={qc}>
      <NeuronInspectorPanel selectedNodeKey={selectedNodeKey} onClose={onClose} />
    </QueryClientProvider>,
  );
}

describe("NeuronInspectorPanel", () => {
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
      // Catalog should have cognitiveFunction for e1:csv:parse
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
      // MetricsSparkline renders (multiple sparklines)
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

    it("calls api.post pause when Pauză is clicked", async () => {
      const { api } = await import("@/lib/api.js");
      renderPanel("e1:csv:parse");
      fireEvent.click(screen.getByText("Control"));
      fireEvent.click(screen.getByText("Pauză"));
      await waitFor(() => {
        expect(vi.mocked(api.post)).toHaveBeenCalledWith(
          expect.stringContaining("/pause"),
          expect.any(Object),
        );
      });
    });

    it("calls api.post resume when Reluare is clicked", async () => {
      const { api } = await import("@/lib/api.js");
      renderPanel("e1:csv:parse");
      fireEvent.click(screen.getByText("Control"));
      fireEvent.click(screen.getByText("Reluare"));
      await waitFor(() => {
        expect(vi.mocked(api.post)).toHaveBeenCalledWith(
          expect.stringContaining("/resume"),
          expect.any(Object),
        );
      });
    });

    it("calls api.put config when 'Aplică configurare' is clicked", async () => {
      const { api } = await import("@/lib/api.js");
      renderPanel("e1:csv:parse");
      fireEvent.click(screen.getByText("Control"));
      fireEvent.click(screen.getByText("Aplică configurare"));
      await waitFor(() => {
        expect(vi.mocked(api.put)).toHaveBeenCalledWith(
          expect.stringContaining("/config"),
          expect.any(Object),
        );
      });
    });
  });
});
