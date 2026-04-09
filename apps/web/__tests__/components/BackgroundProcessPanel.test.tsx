/**
 * BackgroundProcessPanel — contract UI (drawer, KPI, listă, anulare import).
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BackgroundProcessPanel } from "@/components/system/BackgroundProcessPanel.js";
import { useBackgroundProcesses } from "@/hooks/use-background-processes.js";
import type { SystemProcessesResponse } from "@/lib/system-processes-api.js";

function makeQuery(
  overrides: Partial<ReturnType<typeof useBackgroundProcesses>> = {},
): ReturnType<typeof useBackgroundProcesses> {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    status: "success",
    ...overrides,
  } as ReturnType<typeof useBackgroundProcesses>;
}

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("BackgroundProcessPanel", () => {
  it("nu randează nimic când open=false", () => {
    const q = makeQuery();
    const { container } = wrap(<BackgroundProcessPanel open={false} onClose={vi.fn()} query={q} />);
    expect(container.firstChild).toBeNull();
  });

  it("afișează titlu, KPI și proces import cu progress", () => {
    const payload: SystemProcessesResponse = {
      success: true,
      data: {
        activeCount: 1,
        queuesReachable: true,
        processes: [
          {
            id: "import:batch-1",
            category: "Imports",
            name: "fisier.csv",
            progressPercent: 40,
            durationMs: 120_000,
            status: "running",
            cancellable: true,
            cancel: { kind: "import_batch", batchId: "batch-1" },
            startedAt: "2026-04-09T10:00:00.000Z",
            meta: { batchId: "batch-1", dbStatus: "processing" },
          },
        ],
      },
    };
    const q = makeQuery({ data: payload });
    wrap(<BackgroundProcessPanel open onClose={vi.fn()} query={q} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toBeInstanceOf(HTMLDialogElement);
    expect(screen.getByText("Procese în fundal")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // Kpi active
    expect(screen.getByText("fisier.csv")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anulează" })).toBeInTheDocument();
  });

  it("afișează meta cozi (w/a/d/f) pentru rânduri queue", () => {
    const payload: SystemProcessesResponse = {
      success: true,
      data: {
        activeCount: 1,
        queuesReachable: true,
        processes: [
          {
            id: "queue:enrich:test",
            category: "Enrichment Pipeline",
            name: "enrich:test",
            progressPercent: null,
            durationMs: null,
            status: "running",
            cancellable: false,
            startedAt: null,
            meta: { waiting: 2, active: 1, delayed: 0, failed: 0 },
          },
        ],
      },
    };
    const q = makeQuery({ data: payload });
    wrap(<BackgroundProcessPanel open onClose={vi.fn()} query={q} />);
    expect(screen.getByText(/w 2/)).toBeInTheDocument();
    expect(screen.getByText(/a 1/)).toBeInTheDocument();
  });

  it("închide la click pe overlay", () => {
    const onClose = vi.fn();
    const q = makeQuery({
      data: {
        success: true,
        data: { activeCount: 0, queuesReachable: true, processes: [] },
      },
    });
    wrap(<BackgroundProcessPanel open onClose={onClose} query={q} />);
    fireEvent.click(screen.getByLabelText("Închide panoul procese"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
