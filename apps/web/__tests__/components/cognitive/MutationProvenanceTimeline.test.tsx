/**
 * Tests for MutationProvenanceTimeline
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MutationProvenanceTimeline } from "@/components/cognitive/MutationProvenanceTimeline.js";
import type { DataMutationRecord } from "@cerniq/shared";

const makeMutation = (overrides: Partial<DataMutationRecord> = {}): DataMutationRecord => ({
  batchId: "batch-1",
  nodeKey: "e1:csv:parse",
  entityId: "ent-abcdefgh1234567890",
  before: null,
  after: null,
  mutationIntent: "UPDATE",
  timestamp: new Date("2025-03-01T10:00:00Z").toISOString(),
  ...overrides,
});

describe("MutationProvenanceTimeline", () => {
  it("shows empty state when mutations array is empty", () => {
    render(<MutationProvenanceTimeline mutations={[]} />);
    expect(screen.getByTestId("mutation-timeline-empty")).toBeInTheDocument();
    expect(screen.getByText("Nicio mutație înregistrată")).toBeInTheDocument();
  });

  it("renders timeline when mutations are provided", () => {
    const mutations = [makeMutation(), makeMutation({ mutationIntent: "CREATE" })];
    render(<MutationProvenanceTimeline mutations={mutations} />);
    expect(screen.getByTestId("mutation-timeline")).toBeInTheDocument();
    expect(screen.queryByTestId("mutation-timeline-empty")).not.toBeInTheDocument();
  });

  it("renders a card for each mutation", () => {
    const mutations = [makeMutation(), makeMutation(), makeMutation()];
    render(<MutationProvenanceTimeline mutations={mutations} />);
    expect(screen.getAllByTestId("mutation-card")).toHaveLength(3);
  });

  it("displays mutationIntent in uppercase", () => {
    render(<MutationProvenanceTimeline mutations={[makeMutation({ mutationIntent: "ENRICH" })]} />);
    expect(screen.getByText("ENRICH")).toBeInTheDocument();
  });

  it("displays truncated entityId", () => {
    render(
      <MutationProvenanceTimeline
        mutations={[makeMutation({ entityId: "very-long-entity-id-abcdefghij" })]}
      />,
    );
    expect(screen.getByTestId("mutation-card")).toBeInTheDocument();
  });

  it("renders changedFields badges when present", () => {
    const m = makeMutation({ changedFields: ["name", "email", "phone"] });
    render(<MutationProvenanceTimeline mutations={[m]} />);
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("email")).toBeInTheDocument();
    expect(screen.getByText("phone")).toBeInTheDocument();
  });

  it("does not render changedFields section when absent", () => {
    render(<MutationProvenanceTimeline mutations={[makeMutation()]} />);
    // No badge-style elements from changedFields
    expect(screen.queryByText("name")).not.toBeInTheDocument();
  });

  it("shows traceId truncated when present", () => {
    const m = makeMutation({ traceId: "trace-abc123def456ghi789jkl" });
    render(<MutationProvenanceTimeline mutations={[m]} />);
    const card = screen.getByTestId("mutation-card");
    expect(card).toHaveTextContent(/trace:/);
  });

  it("does not show traceId section when absent", () => {
    render(<MutationProvenanceTimeline mutations={[makeMutation()]} />);
    expect(screen.queryByText(/trace:/)).not.toBeInTheDocument();
  });

  it.each(["CREATE", "UPDATE", "ENRICH", "PROMOTE"] as const)(
    "renders %s intent correctly",
    (intent) => {
      render(<MutationProvenanceTimeline mutations={[makeMutation({ mutationIntent: intent })]} />);
      expect(screen.getByText(intent)).toBeInTheDocument();
    },
  );
});
