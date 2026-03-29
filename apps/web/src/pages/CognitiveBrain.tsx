import { useState } from "react";
import { BatchSelectorRail } from "@/components/cognitive/BatchSelectorRail.js";
import { CognitiveBrainCanvas } from "@/components/cognitive/CognitiveBrainCanvas.js";
import { NeuronInspectorPanel } from "@/components/cognitive/NeuronInspectorPanel.js";

export function CognitiveBrainPage() {
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);

  return (
    <div
      data-testid="cognitive-brain-page"
      style={{
        display: "flex",
        height: "100%",
        overflow: "hidden",
        background: "var(--color-s950)",
      }}
    >
      {/* Left rail — 280px */}
      <BatchSelectorRail
        selectedBatchId={selectedBatchId}
        onSelect={(id) => {
          setSelectedBatchId(id);
          setSelectedNodeKey(null);
        }}
      />

      {/* Center canvas — flex */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <CognitiveBrainCanvas
          batchId={selectedBatchId}
          selectedNodeKey={selectedNodeKey}
          onNodeSelect={setSelectedNodeKey}
        />
      </div>

      {/* Right inspector — 360px (only when node selected) */}
      <NeuronInspectorPanel
        selectedNodeKey={selectedNodeKey}
        onClose={() => setSelectedNodeKey(null)}
      />
    </div>
  );
}
