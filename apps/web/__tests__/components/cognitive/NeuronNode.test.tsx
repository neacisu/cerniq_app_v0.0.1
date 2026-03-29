/**
 * Tests for NeuronNode — custom ReactFlow node component
 * Validates rendering per NeuronType, status colors, tooltip, metrics LOD
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { NeuronNodeComponent } from "@/components/cognitive/NeuronNode.js";
import { NEURON_COLORS, STATUS_COLORS } from "@/components/cognitive/neuron-tokens.js";

// ReactFlow Handle needs a provider — mock it
vi.mock("@xyflow/react", async () => {
  const React = await import("react");
  return {
    Handle: ({ type, position }: { type: string; position: string }) =>
      React.createElement("div", { "data-handle-type": type, "data-handle-position": position }),
    Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
  };
});

import type { NeuronNodeData } from "@/components/cognitive/NeuronNode.js";

const baseData: NeuronNodeData = {
  nodeKey: "e1:csv:parse",
  neuronType: "SensoryNeuron",
  swimlane: "data-ingest",
  status: "ACTIVE",
  metrics: { processed: 42, failed: 1, avgLatency: 120 },
  cognitiveFunction: "Parsează fișiere CSV brute",
  biologicalAnalogy: "Receptor senzorial auditiv",
  displayName: "CSV Parser",
  pulsing: false,
  showMetrics: false,
  showDetails: true,
  criticality: "HIGH",
};

const baseProps = {
  id: "e1:csv:parse",
  data: baseData,
  type: "neuron" as const,
  selected: false,
  isConnectable: true,
  xPos: 0,
  yPos: 0,
  zIndex: 1,
  dragging: false,
  draggable: false,
  selectable: true,
  deletable: false,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
};

function renderNode(overrides: Partial<typeof baseProps> = {}) {
  return render(
    <TooltipPrimitive.Provider>
      <NeuronNodeComponent {...baseProps} {...overrides} />
    </TooltipPrimitive.Provider>,
  );
}

describe("NeuronNodeComponent", () => {
  it("renders node with data-testid", () => {
    renderNode();
    expect(screen.getByTestId("neuron-node")).toBeInTheDocument();
  });

  it("displays displayName when provided", () => {
    renderNode();
    expect(screen.getByText("CSV Parser")).toBeInTheDocument();
  });

  it("falls back to last segment of nodeKey when no displayName", () => {
    renderNode({ data: { ...baseData, displayName: undefined } });
    expect(screen.getByText("parse")).toBeInTheDocument();
  });

  it("sets data-neuron-type attribute", () => {
    renderNode();
    const node = screen.getByTestId("neuron-node");
    expect(node).toHaveAttribute("data-neuron-type", "SensoryNeuron");
  });

  it("sets data-status attribute", () => {
    renderNode();
    expect(screen.getByTestId("neuron-node")).toHaveAttribute("data-status", "ACTIVE");
  });

  it.each([
    ["ACTIVE", STATUS_COLORS.ACTIVE],
    ["PAUSED", STATUS_COLORS.PAUSED],
    ["ERROR", STATUS_COLORS.ERROR],
  ] as const)("status dot uses correct CSS token for %s", (status, expectedColor) => {
    renderNode({ data: { ...baseData, status } });
    const statusDot = screen.getByLabelText(`status-${status}`);
    expect(statusDot).toHaveStyle({ background: expectedColor });
  });

  it("applies correct CSS token for SensoryNeuron border", () => {
    renderNode();
    const node = screen.getByTestId("neuron-node");
    expect(node.style.border).toContain(NEURON_COLORS.SensoryNeuron);
  });

  it("applies b5 border when selected=true", () => {
    renderNode({ selected: true });
    const node = screen.getByTestId("neuron-node");
    expect(node.style.border).toContain("var(--color-b5)");
  });

  it("shows metrics section when showMetrics=true", () => {
    renderNode({ data: { ...baseData, showMetrics: true } });
    expect(screen.getByTitle("jobs processed")).toBeInTheDocument();
    expect(screen.getByTitle("avg latency ms")).toBeInTheDocument();
  });

  it("hides metrics section when showMetrics=false", () => {
    renderNode();
    expect(screen.queryByTitle("jobs processed")).not.toBeInTheDocument();
  });

  it("marks failed jobs in error color when failed > 0", () => {
    renderNode({
      data: {
        ...baseData,
        showMetrics: true,
        metrics: { processed: 10, failed: 3, avgLatency: 50 },
      },
    });
    const failedEl = screen.getByTitle("jobs failed");
    expect(failedEl.style.color).toBe("var(--color-neuron-failed)");
  });

  it("marks failed jobs OK color when failed = 0", () => {
    renderNode({
      data: {
        ...baseData,
        showMetrics: true,
        metrics: { processed: 10, failed: 0, avgLatency: 50 },
      },
    });
    const failedEl = screen.getByTitle("jobs failed");
    expect(failedEl.style.color).toBe("var(--color-ok)");
  });

  it.each(Object.keys(NEURON_COLORS))("has a color mapping for neuronType %s", (neuronType) => {
    expect(NEURON_COLORS[neuronType]).toMatch(/^var\(--color-/);
  });

  it.each(["ACTIVE", "PAUSED", "ERROR"] as const)("has a status color mapping for %s", (status) => {
    expect(STATUS_COLORS[status]).toMatch(/^var\(--color-/);
  });
});
