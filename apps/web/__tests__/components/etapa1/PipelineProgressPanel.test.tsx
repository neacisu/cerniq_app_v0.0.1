/**
 * Smoke: panou pipeline import — hook-uri mock-uite, QueryClientProvider.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PipelineProgressPanel } from "@/components/etapa1/PipelineProgressPanel.js";

/** Radix Select interzice `value=""` pe Item; panoul folosește nivel gol ca sentinel. */
vi.mock("@/components/ui/select.js", () => ({
  Select: ({
    options,
    value,
    onValueChange,
    placeholder,
  }: {
    options: Array<{ value: string; label: string }>;
    value?: string;
    onValueChange?: (v: string) => void;
    placeholder?: string;
  }) => (
    <select
      aria-label={placeholder ?? "select"}
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value || "__empty__"} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock("@/hooks/use-etapa1.js", () => ({
  useImportPipelineStatus: () => ({
    data: { data: null, success: true },
    isPending: false,
  }),
  useImportJobLogs: () => ({
    data: { success: true, data: [] },
    isPending: false,
  }),
  useImportRuntimeTopology: () => ({
    data: {
      success: true,
      data: {
        batchId: "batch-1",
        batchStatus: "idle",
        workers: [],
        totals: {
          logsLoaded: 0,
          workersDefined: 0,
          liveWaiting: 0,
          liveActive: 0,
          liveDelayed: 0,
          liveFailed: 0,
          observedJobs: 0,
        },
      },
    },
    isPending: false,
  }),
  usePauseImportBatch: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useResumeImportBatch: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePauseImportWorker: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    variables: undefined,
  }),
  useResumeImportWorker: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    variables: undefined,
  }),
}));

vi.mock("@/components/ui/toast-api.js", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderPanel(props: { batchId: string; isActive: boolean }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PipelineProgressPanel {...props} />
    </QueryClientProvider>,
  );
}

describe("PipelineProgressPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stare goală când nu există workeri și nici loguri", () => {
    renderPanel({ batchId: "batch-1", isActive: true });
    expect(
      screen.getByText(/Asteptand primele joburi si loguri de la workeri/i),
    ).toBeInTheDocument();
  });

  it("import inactiv: mesaj snapshot", () => {
    renderPanel({ batchId: "batch-1", isActive: false });
    expect(
      screen.getByText(/Nu exista telemetrie persistata pentru acest import/i),
    ).toBeInTheDocument();
  });
});
