/**
 * Brain: batchId din importuri (Etapa 1) alimentează topologia ICN/ICE și SSE opțional cu `batchId`.
 * Activitatea E3 (cozi Bull) folosește în general `tenantId`/sesiune fără batch de import — evenimentele
 * cognitive globale (`cognitive:events`) pot apărea fără legătură cu batch-ul selectat în UI.
 */
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BatchSelectorRail } from "@/components/cognitive/BatchSelectorRail.js";
import { CognitiveBrainCanvas } from "@/components/cognitive/CognitiveBrainCanvas.js";
import { NeuronInspectorPanel } from "@/components/cognitive/NeuronInspectorPanel.js";

export function CognitiveBrainPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const batchParam = searchParams.get("batch") || null;

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(batchParam);
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);

  function handleBatchSelect(id: string | null) {
    setSelectedBatchId(id);
    setSelectedNodeKey(null);
    if (id) {
      setSearchParams({ batch: id }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }

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
      <BatchSelectorRail selectedBatchId={selectedBatchId} onSelect={handleBatchSelect} />

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

      {/* Right inspector — 360px, montat exclusiv când un nod este selectat */}
      {selectedNodeKey !== null && (
        <NeuronInspectorPanel
          selectedNodeKey={selectedNodeKey}
          batchId={selectedBatchId ?? undefined}
          onClose={() => setSelectedNodeKey(null)}
        />
      )}
    </div>
  );
}
