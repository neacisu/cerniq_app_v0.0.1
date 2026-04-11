import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";
import { CognitiveBrainCanvas } from "@/components/cognitive/CognitiveBrainCanvas.js";

beforeAll(() => {
  globalThis.DOMMatrixReadOnly ??= function DOMMatrixReadOnly() {
    /* stub pentru @xyflow/react în jsdom */
  } as unknown as typeof DOMMatrixReadOnly;
});

vi.mock("@/hooks/use-cognitive-brain.js", () => ({
  useCognitiveBrain: () => ({
    nodes: [],
    edges: [],
    isLoading: true,
  }),
  useCognitiveEventStream: () => ({ connected: true }),
  useCognitiveLOD: () => ({
    lod: "standard" as const,
    showEdgeLabels: true,
    showMetrics: true,
    showNodeDetails: true,
  }),
}));

describe("CognitiveBrainCanvas", () => {
  it("montează canvas cu topologie fallback (catalog)", () => {
    const onNodeSelect = vi.fn();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ReactFlowProvider>
          <div style={{ width: 800, height: 600 }}>
            <CognitiveBrainCanvas
              batchId={null}
              selectedNodeKey={null}
              onNodeSelect={onNodeSelect}
            />
          </div>
        </ReactFlowProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByTestId("cognitive-brain-canvas")).toBeInTheDocument();
  });
});
