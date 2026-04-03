/**
 * Tests for 8 new neuron components — E3/E4/E5
 * Verifică: render, data-testid, culori design tokens, badges CRITICAL/label, metrics display
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NEURON_COLORS } from "@/components/cognitive/neuron-tokens.js";

// ─── Mock @xyflow/react Handles ───────────────────────────────────────────────

vi.mock("@xyflow/react", async () => {
  const React = await import("react");
  return {
    Handle: ({ type, position }: { type: string; position: string }) =>
      React.createElement("div", { "data-handle-type": type, "data-handle-position": position }),
    Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
    NodeProps: {},
    Node: {},
  };
});

import type { NeuronNodeData } from "@/components/cognitive/NeuronNode.js";
import { GuardrailNeuronComponent } from "@/components/cognitive/neurons/GuardrailNeuron.js";
import { ToolNeuronComponent } from "@/components/cognitive/neurons/ToolNeuron.js";
import { FiscalNeuronComponent } from "@/components/cognitive/neurons/FiscalNeuron.js";
import { SafetyNeuronComponent } from "@/components/cognitive/neurons/SafetyNeuron.js";
import { LifecycleNeuronComponent } from "@/components/cognitive/neurons/LifecycleNeuron.js";
import { ChurnNeuronComponent } from "@/components/cognitive/neurons/ChurnNeuron.js";
import { ComplianceNeuronComponent } from "@/components/cognitive/neurons/ComplianceNeuron.js";
import { KnowledgeNeuronComponent } from "@/components/cognitive/neurons/KnowledgeNeuron.js";

// ─── Shared test helpers ──────────────────────────────────────────────────────

const baseData: NeuronNodeData = {
  nodeKey: "test:node:key",
  neuronType: "TestNeuron",
  swimlane: "test-swimlane",
  status: "ACTIVE",
  metrics: { processed: 10, failed: 0, avgLatency: 50 },
  displayName: "Test Node",
  pulsing: false,
  showMetrics: false,
  showDetails: false,
  criticality: "HIGH",
};

const baseNodeProps = {
  id: "test-node",
  // Each neuron component requires its specific literal type (e.g., "guardrail-neuron").
  // We cast through `unknown` to `never` (TypeScript bottom type), which is assignable
  // to all types — including any literal — without using `any` or changing the 8+ call sites.
  type: "test-neuron" as unknown as never,
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

function makeProps(data: Partial<NeuronNodeData> = {}, selected = false) {
  return { ...baseNodeProps, data: { ...baseData, ...data }, selected };
}

// ─── neuron-tokens.ts — color mappings ───────────────────────────────────────

describe("neuron-tokens NEURON_COLORS — E3 new types", () => {
  it("GuardrailNeuron maps to --color-neuron-guardrail", () => {
    expect(NEURON_COLORS.GuardrailNeuron).toBe("var(--color-neuron-guardrail)");
  });

  it("ToolNeuron maps to --color-neuron-tool", () => {
    expect(NEURON_COLORS.ToolNeuron).toBe("var(--color-neuron-tool)");
  });

  it("FiscalNeuron maps to --color-neuron-fiscal", () => {
    expect(NEURON_COLORS.FiscalNeuron).toBe("var(--color-neuron-fiscal)");
  });

  it("SafetyNeuron maps to --color-neuron-safety", () => {
    expect(NEURON_COLORS.SafetyNeuron).toBe("var(--color-neuron-safety)");
  });

  it("KnowledgeNeuron maps to --color-neuron-knowledge", () => {
    expect(NEURON_COLORS.KnowledgeNeuron).toBe("var(--color-neuron-knowledge)");
  });
});

describe("neuron-tokens NEURON_COLORS — E5 new types", () => {
  it("LifecycleNeuron maps to --color-neuron-lifecycle", () => {
    expect(NEURON_COLORS.LifecycleNeuron).toBe("var(--color-neuron-lifecycle)");
  });

  it("ChurnNeuron maps to --color-neuron-churn", () => {
    expect(NEURON_COLORS.ChurnNeuron).toBe("var(--color-neuron-churn)");
  });

  it("ComplianceNeuron maps to --color-neuron-compliance", () => {
    expect(NEURON_COLORS.ComplianceNeuron).toBe("var(--color-neuron-compliance)");
  });
});

describe("neuron-tokens NEURON_COLORS — fixed E3 mappings (were wrong)", () => {
  it("all color values use CSS var() pattern", () => {
    Object.entries(NEURON_COLORS).forEach(([type, color]) => {
      expect(color, `${type} should use CSS var()`).toMatch(/^var\(--color-/);
    });
  });
});

// ─── GuardrailNeuron ─────────────────────────────────────────────────────────

describe("GuardrailNeuronComponent", () => {
  it("renders with data-testid guardrail-neuron", () => {
    render(<GuardrailNeuronComponent {...makeProps({ neuronType: "GuardrailNeuron" })} />);
    expect(screen.getByTestId("guardrail-neuron")).toBeInTheDocument();
  });

  it("has neuronType attribute GuardrailNeuron", () => {
    render(<GuardrailNeuronComponent {...makeProps({ neuronType: "GuardrailNeuron" })} />);
    expect(screen.getByTestId("guardrail-neuron")).toHaveAttribute(
      "data-neuron-type",
      "GuardrailNeuron",
    );
  });

  it("shows CRITICAL badge", () => {
    render(<GuardrailNeuronComponent {...makeProps({ criticality: "CRITICAL" })} />);
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
  });

  it("displays displayName", () => {
    render(<GuardrailNeuronComponent {...makeProps({ displayName: "Price Check" })} />);
    expect(screen.getByText("Price Check")).toBeInTheDocument();
  });

  it("falls back to nodeKey segment when no displayName", () => {
    render(
      <GuardrailNeuronComponent
        {...makeProps({ displayName: undefined, nodeKey: "guardrail:price:check" })}
      />,
    );
    expect(screen.getByText("check")).toBeInTheDocument();
  });

  it("shows metrics when showMetrics=true", () => {
    render(
      <GuardrailNeuronComponent
        {...makeProps({ showMetrics: true, metrics: { processed: 42, failed: 2, avgLatency: 10 } })}
      />,
    );
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it("shows PASS text when no failures", () => {
    render(
      <GuardrailNeuronComponent
        {...makeProps({ showMetrics: true, metrics: { processed: 42, failed: 0, avgLatency: 10 } })}
      />,
    );
    expect(screen.getByText("PASS")).toBeInTheDocument();
  });

  it("applies gold border when selected", () => {
    render(<GuardrailNeuronComponent {...makeProps({}, true)} />);
    const el = screen.getByTestId("guardrail-neuron");
    expect(el.style.border).toContain("var(--color-b5)");
  });
});

// ─── ToolNeuron ───────────────────────────────────────────────────────────────

describe("ToolNeuronComponent", () => {
  it("renders with data-testid tool-neuron", () => {
    render(<ToolNeuronComponent {...makeProps({ neuronType: "ToolNeuron" })} />);
    expect(screen.getByTestId("tool-neuron")).toBeInTheDocument();
  });

  it("shows MCP badge", () => {
    render(<ToolNeuronComponent {...makeProps({ neuronType: "ToolNeuron" })} />);
    expect(screen.getByText("MCP")).toBeInTheDocument();
  });

  it("has correct neuronType attribute", () => {
    render(<ToolNeuronComponent {...makeProps({ neuronType: "ToolNeuron" })} />);
    expect(screen.getByTestId("tool-neuron")).toHaveAttribute("data-neuron-type", "ToolNeuron");
  });

  it("shows metrics calls count when showMetrics=true", () => {
    render(
      <ToolNeuronComponent
        {...makeProps({ showMetrics: true, metrics: { processed: 100, failed: 0, avgLatency: 5 } })}
      />,
    );
    expect(screen.getByText(/calls:/)).toBeInTheDocument();
  });
});

// ─── FiscalNeuron ─────────────────────────────────────────────────────────────

describe("FiscalNeuronComponent", () => {
  it("renders with data-testid fiscal-neuron", () => {
    render(<FiscalNeuronComponent {...makeProps({ neuronType: "FiscalNeuron" })} />);
    expect(screen.getByTestId("fiscal-neuron")).toBeInTheDocument();
  });

  it("shows FISCAL badge", () => {
    render(<FiscalNeuronComponent {...makeProps()} />);
    expect(screen.getByText("FISCAL")).toBeInTheDocument();
  });

  it("uses --color-er border when criticality=CRITICAL", () => {
    render(<FiscalNeuronComponent {...makeProps({ criticality: "CRITICAL" })} />);
    const el = screen.getByTestId("fiscal-neuron");
    expect(el.style.border).toContain("var(--color-er)");
  });
});

// ─── SafetyNeuron ─────────────────────────────────────────────────────────────

describe("SafetyNeuronComponent", () => {
  it("renders with data-testid safety-neuron", () => {
    render(<SafetyNeuronComponent {...makeProps({ neuronType: "SafetyNeuron" })} />);
    expect(screen.getByTestId("safety-neuron")).toBeInTheDocument();
  });

  it("always uses --color-er border (safety net is always critical)", () => {
    render(<SafetyNeuronComponent {...makeProps()} />);
    const el = screen.getByTestId("safety-neuron");
    expect(el.style.border).toContain("var(--color-er)");
  });

  it("shows SAFETY NET badge", () => {
    render(<SafetyNeuronComponent {...makeProps()} />);
    expect(screen.getByText("SAFETY NET")).toBeInTheDocument();
  });

  it("shows OK status when no failures", () => {
    render(
      <SafetyNeuronComponent
        {...makeProps({ showMetrics: true, metrics: { processed: 5, failed: 0, avgLatency: 10 } })}
      />,
    );
    expect(screen.getByText(/OK/)).toBeInTheDocument();
  });

  it("shows 🚨 when failures present", () => {
    render(
      <SafetyNeuronComponent
        {...makeProps({ showMetrics: true, metrics: { processed: 5, failed: 1, avgLatency: 10 } })}
      />,
    );
    expect(screen.getByText(/🚨/)).toBeInTheDocument();
  });
});

// ─── LifecycleNeuron ──────────────────────────────────────────────────────────

describe("LifecycleNeuronComponent", () => {
  it("renders with data-testid lifecycle-neuron", () => {
    render(<LifecycleNeuronComponent {...makeProps({ neuronType: "LifecycleNeuron" })} />);
    expect(screen.getByTestId("lifecycle-neuron")).toBeInTheDocument();
  });

  it("shows LIFECYCLE badge", () => {
    render(<LifecycleNeuronComponent {...makeProps()} />);
    expect(screen.getByText("LIFECYCLE")).toBeInTheDocument();
  });

  it("shows clients count in metrics", () => {
    render(
      <LifecycleNeuronComponent
        {...makeProps({
          showMetrics: true,
          metrics: { processed: 1247, failed: 0, avgLatency: 30 },
        })}
      />,
    );
    expect(screen.getByText(/clients:/)).toBeInTheDocument();
  });
});

// ─── ChurnNeuron ──────────────────────────────────────────────────────────────

describe("ChurnNeuronComponent", () => {
  it("renders with data-testid churn-neuron", () => {
    render(<ChurnNeuronComponent {...makeProps({ neuronType: "ChurnNeuron" })} />);
    expect(screen.getByTestId("churn-neuron")).toBeInTheDocument();
  });

  it("shows CHURN AI badge", () => {
    render(<ChurnNeuronComponent {...makeProps()} />);
    expect(screen.getByText("CHURN AI")).toBeInTheDocument();
  });

  it("applies stronger glow when ACTIVE", () => {
    render(<ChurnNeuronComponent {...makeProps({ status: "ACTIVE" })} />);
    const el = screen.getByTestId("churn-neuron");
    expect(el.style.boxShadow).toContain("var(--color-neuron-churn)");
  });
});

// ─── ComplianceNeuron ─────────────────────────────────────────────────────────

describe("ComplianceNeuronComponent", () => {
  it("renders with data-testid compliance-neuron", () => {
    render(<ComplianceNeuronComponent {...makeProps({ neuronType: "ComplianceNeuron" })} />);
    expect(screen.getByTestId("compliance-neuron")).toBeInTheDocument();
  });

  it("shows GDPR badge", () => {
    render(<ComplianceNeuronComponent {...makeProps()} />);
    expect(screen.getByText("GDPR")).toBeInTheDocument();
  });

  it("shows GDPR OK when no failures", () => {
    render(
      <ComplianceNeuronComponent
        {...makeProps({ showMetrics: true, metrics: { processed: 50, failed: 0, avgLatency: 20 } })}
      />,
    );
    expect(screen.getByText(/GDPR OK/)).toBeInTheDocument();
  });
});

// ─── KnowledgeNeuron ──────────────────────────────────────────────────────────

describe("KnowledgeNeuronComponent", () => {
  it("renders with data-testid knowledge-neuron", () => {
    render(<KnowledgeNeuronComponent {...makeProps({ neuronType: "KnowledgeNeuron" })} />);
    expect(screen.getByTestId("knowledge-neuron")).toBeInTheDocument();
  });

  it("shows RAG badge", () => {
    render(<KnowledgeNeuronComponent {...makeProps()} />);
    expect(screen.getByText("RAG")).toBeInTheDocument();
  });

  it("shows embeds metric when showMetrics=true", () => {
    render(
      <KnowledgeNeuronComponent
        {...makeProps({
          showMetrics: true,
          metrics: { processed: 312, failed: 0, avgLatency: 80 },
        })}
      />,
    );
    expect(screen.getByText(/embeds:/)).toBeInTheDocument();
  });
});

// ─── neurons/index.ts barrel exports ─────────────────────────────────────────

describe("neurons/index.ts barrel exports", () => {
  it("exports all 16 neuron components", async () => {
    const barrel = await import("@/components/cognitive/neurons/index.js");
    const expectedExports = [
      "GuardrailNeuronComponent",
      "ToolNeuronComponent",
      "FiscalNeuronComponent",
      "SafetyNeuronComponent",
      "KnowledgeNeuronComponent",
      "ReconciliationNeuronComponent",
      "CreditNeuronComponent",
      "LogisticsNeuronComponent",
      "ContractNeuronComponent",
      "LifecycleNeuronComponent",
      "ChurnNeuronComponent",
      "SocialNeuronComponent",
      "GraphNeuronComponent",
      "EnvironmentNeuronComponent",
      "ComplianceNeuronComponent",
      "FeedbackNeuronComponent",
    ];
    expectedExports.forEach((name) => {
      expect(barrel[name as keyof typeof barrel], `${name} should be exported`).toBeDefined();
    });
  });
});
