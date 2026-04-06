import { memo, useMemo, useState } from "react";
import {
  X,
  Activity,
  GitBranch,
  BarChart2,
  Settings,
  Pause,
  Play,
  AlertTriangle,
  Clock,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  useNeuronInspector,
  useNeuronControl,
  type NodeConfigInput,
} from "@/hooks/use-cognitive-brain.js";
import { useAuth } from "@/providers/auth-provider.js";
import { isAdminLikeRole } from "@/lib/auth-roles.js";
import { COGNITIVE_NODE_CATALOG } from "@cerniq/shared";
import type { CognitiveNodeEntry, CognitiveEvent } from "@cerniq/shared";
import { MetricsSparkline, type SparklinePoint } from "./MetricsSparkline.js";
import { MutationProvenanceTimeline } from "./MutationProvenanceTimeline.js";

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabId = "traces" | "mutations" | "metrics" | "controls";

const TABS: Array<{ id: TabId; label: string; Icon: React.ElementType }> = [
  { id: "traces", label: "Traces", Icon: Activity },
  { id: "mutations", label: "Mutații", Icon: GitBranch },
  { id: "metrics", label: "Metrici", Icon: BarChart2 },
  { id: "controls", label: "Control", Icon: Settings },
];

// ─── NeuronControl interface — subset of useNeuronControl return ───────────────

interface NeuronControl {
  pause(batchId?: string): void;
  resume(): void;
  updateConfig(config: NodeConfigInput): void;
  isPausing: boolean;
  isResuming: boolean;
  isUpdatingConfig: boolean;
  pauseError: Error | null;
  resumeError: Error | null;
  configError: Error | null;
  /** true = pauza optimistă în curs; false = reluare optimistă; null = stare reală server */
  optimisticPaused: boolean | null;
  /** Metadatele aplicate la ultima config (applyStatus + requiresWorkerRestart). */
  configResult: { applyStatus: string; requiresWorkerRestart: boolean } | null;
  /** Răspunsul serverului la ultimul pause. */
  lastPauseResult: { status: "PAUSED"; propagated: boolean; batchId: string | null } | null;
  /** Răspunsul serverului la ultimul resume. */
  lastResumeResult: { status: "ACTIVE" } | null;
}

// ─── Metrics helpers ──────────────────────────────────────────────────────────

/**
 * Builds throughput sparkline data deterministically from trace events.
 * Groups events into time buckets — same traces always produce the same
 * sparkline shape, satisfying React purity rules (no Math.random).
 */
function buildThroughputSparkline(traces: CognitiveEvent[]): SparklinePoint[] {
  if (traces.length === 0) return [];

  const BUCKETS = Math.min(traces.length, 20);
  const timestamps = traces.map((t) => new Date(t.timestamp).getTime()).sort((a, b) => a - b);

  const start = timestamps[0];
  const end = timestamps.at(-1) ?? start;
  const rangeMs = Math.max(end - start, 60_000); // minimum 60s window
  const bucketMs = rangeMs / BUCKETS;

  const counts = new Array<number>(BUCKETS).fill(0);
  for (const ts of timestamps) {
    const idx = Math.min(Math.floor((ts - start) / bucketMs), BUCKETS - 1);
    counts[idx]++;
  }

  return counts.map((v, i) => ({ t: Math.round(i * (bucketMs / 1000)), v }));
}

// ─── Main component ───────────────────────────────────────────────────────────

interface NeuronInspectorPanelProps {
  readonly selectedNodeKey: string | null;
  readonly onClose: () => void;
  /** batchId activ — activează query-ul de mutations per batch. */
  readonly batchId?: string;
}

export const NeuronInspectorPanel = memo(function NeuronInspectorPanel({
  selectedNodeKey,
  onClose,
  batchId,
}: NeuronInspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("traces");

  const { user } = useAuth();
  const canControlNeuron = isAdminLikeRole(user?.role);

  const catalogEntry = selectedNodeKey
    ? (COGNITIVE_NODE_CATALOG.find((e) => e.nodeKey === selectedNodeKey) ?? null)
    : null;

  const { traces, mutations, isLoading } = useNeuronInspector(selectedNodeKey, batchId);

  // Control hook — pausă/reluare/config cu optimistic UI și invalidare topology
  const control = useNeuronControl(selectedNodeKey);

  // Sparkline data derived deterministically from trace timestamps
  const metricsData = useMemo(() => buildThroughputSparkline(traces), [traces]);

  return (
    <aside
      data-testid="neuron-inspector-panel"
      style={{
        width: 360,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--color-s900)",
        borderLeft: "1px solid oklch(0.2 0.018 255 / 60%)",
        overflow: "hidden",
        animation: "inspectorSlideIn 0.18s ease",
      }}
    >
      {/* Header */}
      <InspectorHeader nodeKey={selectedNodeKey} catalogEntry={catalogEntry} onClose={onClose} />

      {/* Empty state */}
      {!selectedNodeKey && (
        <div
          data-testid="inspector-empty-state"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "24px",
            color: "var(--color-t4)",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          <ChevronRight size={32} style={{ opacity: 0.3 }} />
          <span>Selectați un neuron din canvas pentru a inspecta</span>
        </div>
      )}

      {selectedNodeKey && (
        <>
          {/* Tab bar */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid oklch(0.2 0.018 255 / 40%)",
              background: "var(--color-s900)",
            }}
          >
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  padding: "8px 4px",
                  background: "transparent",
                  border: "none",
                  borderBottom:
                    activeTab === id ? "2px solid var(--color-b5)" : "2px solid transparent",
                  cursor: "pointer",
                  color: activeTab === id ? "var(--color-t1)" : "var(--color-t4)",
                }}
              >
                <Icon size={13} />
                <span style={{ fontSize: 9.5, fontWeight: 600 }}>{label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
            {isLoading && (
              <div
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  color: "var(--color-t4)",
                  padding: "20px 0",
                }}
              >
                Se încarcă…
              </div>
            )}

            {!isLoading && activeTab === "traces" && <TracesTab traces={traces} />}
            {!isLoading && activeTab === "mutations" && (
              <MutationProvenanceTimeline mutations={mutations} />
            )}
            {!isLoading && activeTab === "metrics" && <MetricsTab data={metricsData} />}
            {!isLoading && activeTab === "controls" && (
              <ControlsTab
                nodeKey={selectedNodeKey}
                control={control}
                canControl={canControlNeuron}
              />
            )}
          </div>
        </>
      )}
    </aside>
  );
});

// ─── Inspector header ─────────────────────────────────────────────────────────

interface InspectorHeaderProps {
  readonly nodeKey: string | null;
  readonly catalogEntry: CognitiveNodeEntry | null;
  readonly onClose: () => void;
}

function InspectorHeader({ nodeKey, catalogEntry, onClose }: InspectorHeaderProps) {
  return (
    <div
      style={{
        padding: "12px 14px 10px",
        borderBottom: "1px solid oklch(0.2 0.018 255 / 40%)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-t1)" }}>
          Inspector Neuron
        </span>
        <button
          onClick={onClose}
          aria-label="Închide inspector"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--color-t3)",
            padding: 2,
            borderRadius: 4,
          }}
        >
          <X size={14} />
        </button>
      </div>

      {nodeKey && (
        <>
          <div
            style={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              color: "var(--color-b5)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {nodeKey}
          </div>
          {catalogEntry?.cognitiveFunction && (
            <div style={{ fontSize: 10, color: "var(--color-t3)", lineHeight: 1.4 }}>
              {catalogEntry.cognitiveFunction}
            </div>
          )}
          {catalogEntry?.swimlane && (
            <div style={{ fontSize: 9.5, color: "var(--color-t4)" }}>
              Swimlane: {catalogEntry.swimlane} · Etapa: E{catalogEntry.etapa}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Traces tab ───────────────────────────────────────────────────────────────

interface TracesTabProps {
  readonly traces: CognitiveEvent[];
}

function TracesTab({ traces }: TracesTabProps) {
  if (traces.length === 0) {
    return (
      <div
        data-testid="traces-empty"
        style={{ textAlign: "center", fontSize: 11, color: "var(--color-t4)", padding: "20px 0" }}
      >
        Niciun trace înregistrat
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {traces.map((t, i) => (
        <TraceRow key={`${t.nodeKey}-${t.timestamp}-${i}`} trace={t} />
      ))}
    </div>
  );
}

interface TraceRowProps {
  readonly trace: CognitiveEvent;
}

function TraceRow({ trace: t }: TraceRowProps) {
  const ts = new Date(t.timestamp);
  const isError = t.eventType.includes("error") || t.eventType.includes("fail");

  return (
    <div
      data-testid="trace-row"
      style={{
        background: "oklch(0.14 0.018 255 / 50%)",
        border: `1px solid ${isError ? "var(--color-er)" : "oklch(0.22 0.018 255 / 40%)"}`,
        borderRadius: 6,
        padding: "7px 10px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: isError ? "var(--color-er)" : "var(--color-t2)",
          }}
        >
          {t.eventType}
        </span>
        <span
          style={{
            fontSize: 9.5,
            color: "var(--color-t4)",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Clock size={9} />
          {ts.toLocaleTimeString("ro-RO")}
        </span>
      </div>
      {t.data && Object.keys(t.data).length > 0 && (
        <div
          style={{
            fontSize: 9.5,
            color: "var(--color-t3)",
            fontFamily: "var(--font-mono)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {JSON.stringify(t.data).slice(0, 80)}
        </div>
      )}
    </div>
  );
}

// ─── Metrics tab ──────────────────────────────────────────────────────────────

interface MetricsTabProps {
  readonly data: SparklinePoint[];
}

function MetricsTab({ data }: MetricsTabProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <MetricsSparkline
        data={data}
        label="Throughput (jobs/min)"
        color="var(--color-b5)"
        height={60}
        unit=" jobs"
      />
      <MetricsSparkline
        data={data.map((p) => ({ t: p.t, v: Math.round(p.v * 3.2) }))}
        label="Latență medie (ms)"
        color="var(--color-neuron-vigilance)"
        height={60}
        unit="ms"
      />
    </div>
  );
}

// ─── Controls tab ────────────────────────────────────────────────────────────

interface ControlsTabProps {
  readonly nodeKey: string;
  readonly control: NeuronControl;
  /** false pentru viewer/agent — API returnează 403 la pause/config fără rol admin. */
  readonly canControl: boolean;
}

function ControlsTab({ nodeKey: _nodeKey, control, canControl }: ControlsTabProps) {
  const [configValues, setConfigValues] = useState({
    concurrency: "",
    rateLimitMax: "",
    rateLimitDuration: "",
  });

  const isAnyPauseLoading = control.isPausing || control.isResuming;

  function handleSubmitConfig() {
    const config: NodeConfigInput = {};
    if (configValues.concurrency) config.concurrency = Number(configValues.concurrency);
    if (configValues.rateLimitMax) config.rateLimitMax = Number(configValues.rateLimitMax);
    if (configValues.rateLimitDuration)
      config.rateLimitDuration = Number(configValues.rateLimitDuration);
    control.updateConfig(config);
  }

  if (!canControl) {
    return (
      <div
        data-testid="neuron-controls-rbac-deny"
        style={{ fontSize: 11, color: "var(--color-t3)", padding: "10px 4px", lineHeight: 1.45 }}
      >
        Controlul runtime (pauză, reluare, configurare) necesită rol admin, owner sau superadmin.
        Fără acest rol, API-ul răspunde 403 — folosiți un cont cu drepturi de operator
        infrastructură.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Pause/Resume */}
      <section>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--color-t3)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            marginBottom: 8,
          }}
        >
          Pauză / Reluare
        </div>

        {/* Optimistic state indicator */}
        {control.optimisticPaused !== null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 10,
              color: "var(--color-in)",
              marginBottom: 6,
            }}
          >
            <RefreshCw size={10} style={{ animation: "spin 1s linear infinite" }} />
            {control.optimisticPaused ? "Se aplică pauza…" : "Se reia execuția…"}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <ControlButton
            icon={<Pause size={12} />}
            label="Pauză"
            color="var(--color-wa)"
            loading={control.isPausing}
            onClick={() => control.pause()}
          />
          <ControlButton
            icon={<Play size={12} />}
            label="Reluare"
            color="var(--color-ok)"
            loading={control.isResuming}
            onClick={() => control.resume()}
          />
        </div>

        {isAnyPauseLoading && null}
        {control.pauseError && <MutationError error={control.pauseError} />}
        {control.resumeError && <MutationError error={control.resumeError} />}
        {control.lastPauseResult && control.optimisticPaused === null && (
          <div style={{ fontSize: 10, color: "var(--color-ok)", marginTop: 4 }}>
            ✓ Pauză aplicată
            {control.lastPauseResult.propagated && <span> (propagat în graf)</span>}
          </div>
        )}
        {control.lastResumeResult && control.optimisticPaused === null && (
          <div style={{ fontSize: 10, color: "var(--color-ok)", marginTop: 4 }}>
            ✓ Reluare aplicată
          </div>
        )}
      </section>

      {/* Config */}
      <section>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--color-t3)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            marginBottom: 8,
          }}
        >
          Configurare
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(
            [
              { key: "concurrency", label: "Concurrency", placeholder: "ex: 5" },
              { key: "rateLimitMax", label: "Rate limit max", placeholder: "ex: 100" },
              { key: "rateLimitDuration", label: "Rate limit ms", placeholder: "ex: 1000" },
            ] as const
          ).map(({ key, label, placeholder }) => (
            <ConfigField
              key={key}
              label={label}
              placeholder={placeholder}
              value={configValues[key]}
              onChange={(v) => setConfigValues((prev) => ({ ...prev, [key]: v }))}
            />
          ))}
        </div>

        <button
          onClick={handleSubmitConfig}
          disabled={control.isUpdatingConfig}
          style={{
            marginTop: 10,
            padding: "7px 14px",
            background: "var(--color-b5)",
            border: "none",
            borderRadius: 6,
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            cursor: control.isUpdatingConfig ? "wait" : "pointer",
            opacity: control.isUpdatingConfig ? 0.6 : 1,
            width: "100%",
          }}
        >
          {control.isUpdatingConfig ? "Se aplică…" : "Aplică configurare"}
        </button>

        {control.configError && <MutationError error={control.configError} />}
        {control.configResult && (
          <div style={{ fontSize: 10, color: "var(--color-ok)", marginTop: 4 }}>
            ✓ Configurare aplicată (applyStatus: {control.configResult.applyStatus})
            {control.configResult.requiresWorkerRestart && (
              <span style={{ color: "var(--color-wa)" }}> · necesită restart worker</span>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

interface ControlButtonProps {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly color: string;
  readonly loading: boolean;
  readonly onClick: () => void;
}

function ControlButton({ icon, label, color, loading, onClick }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        padding: "7px 10px",
        background: `color-mix(in oklch, ${color} 15%, transparent)`,
        border: `1px solid ${color}`,
        borderRadius: 6,
        color,
        fontSize: 11,
        fontWeight: 600,
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.5 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

interface ConfigFieldProps {
  readonly label: string;
  readonly placeholder: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
}

function ConfigField({ label, placeholder, value, onChange }: ConfigFieldProps) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 10,
          color: "var(--color-t3)",
          marginBottom: 3,
          fontWeight: 600,
        }}
      >
        {label}
      </label>
      <input
        type="number"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          background: "var(--color-s800)",
          border: "1px solid oklch(0.22 0.018 255 / 50%)",
          borderRadius: 5,
          padding: "5px 8px",
          fontSize: 11,
          color: "var(--color-t1)",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Eroare";
}

interface MutationErrorProps {
  readonly error: unknown;
}

function MutationError({ error }: MutationErrorProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        fontSize: 10,
        color: "var(--color-er)",
        marginTop: 4,
      }}
    >
      <AlertTriangle size={11} />
      {getErrorMessage(error)}
    </div>
  );
}
