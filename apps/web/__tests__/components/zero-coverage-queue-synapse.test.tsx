import type { ReactNode } from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Position, ReactFlowProvider } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import {
  QueueSynapseComponent,
  type QueueSynapseEdge,
} from "@/components/cognitive/QueueSynapse.js";

function props(over: Partial<EdgeProps<QueueSynapseEdge>>): EdgeProps<QueueSynapseEdge> {
  return {
    id: "e1",
    source: "s",
    target: "t",
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 50,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: { edgeType: "TRIGGER" },
    ...over,
  } as EdgeProps<QueueSynapseEdge>;
}

describe("QueueSynapseComponent", () => {
  it("randează muchie cu și fără label", () => {
    const wrap = (node: ReactNode) => (
      <ReactFlowProvider>
        <svg>{node}</svg>
      </ReactFlowProvider>
    );
    const { rerender, container } = render(
      wrap(<QueueSynapseComponent {...props({ label: "L" })} />),
    );
    expect(container.querySelector("path")).toBeTruthy();
    rerender(
      wrap(
        <QueueSynapseComponent {...props({ label: undefined, data: { edgeType: "unknown" } })} />,
      ),
    );
  });
});
