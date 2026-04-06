/**
 * Import detail (/imports/:id): stări încărcare/eroare/conținut + acțiune Pause (mutație mock).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import React from "react";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/etapa1/PipelineProgressPanel.js", () => ({
  PipelineProgressPanel: () => <div data-testid="pipeline-progress-stub" />,
}));

vi.mock("@/hooks/use-etapa1.js", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/hooks/use-etapa1.js")>();
  return {
    ...mod,
    useImportDetail: vi.fn(mod.useImportDetail),
    useImportEntities: vi.fn(mod.useImportEntities),
    useImportQuarantine: vi.fn(mod.useImportQuarantine),
    useImportRows: vi.fn(mod.useImportRows),
    useImportReprocessErrors: vi.fn(mod.useImportReprocessErrors),
    useCancelImport: vi.fn(mod.useCancelImport),
    usePauseImportBatch: vi.fn(mod.usePauseImportBatch),
    useResumeImportBatch: vi.fn(mod.useResumeImportBatch),
    useDeleteImportBatch: vi.fn(mod.useDeleteImportBatch),
    useAnafEnrichImport: vi.fn(mod.useAnafEnrichImport),
    useResumeImportReprocessErrors: vi.fn(mod.useResumeImportReprocessErrors),
  };
});

import {
  useAnafEnrichImport,
  useCancelImport,
  useDeleteImportBatch,
  useImportDetail,
  useImportEntities,
  useImportQuarantine,
  useImportReprocessErrors,
  useImportRows,
  usePauseImportBatch,
  useResumeImportBatch,
  useResumeImportReprocessErrors,
} from "@/hooks/use-etapa1.js";
import { ImportDetail } from "@/pages/etapa1/import-detail.js";

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/imports/batch-rtl-1"]}>
        <Routes>
          <Route path="/imports/:id" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const emptyList = { success: true as const, data: [] as unknown[] };

const detailPayload = {
  filename: "contacts-enterprise.csv",
  status: "completed",
  processedRows: 10,
  totalRows: 10,
  successRows: 10,
  metadata: {},
  control: { batchPaused: false, hidden: false },
  identitySummary: {},
  historicalSummary: {
    resolvedCompanies: 0,
    identityConflictRows: 0,
    insufficientIdentifierRows: 0,
  },
  latestAttemptSummary: { successRows: 10 },
  quarantineSummary: { totalRows: 0 },
};

function setupMutations() {
  vi.mocked(usePauseImportBatch).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  } as never);
  vi.mocked(useResumeImportBatch).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  } as never);
  vi.mocked(useCancelImport).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  } as never);
  vi.mocked(useDeleteImportBatch).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  } as never);
  vi.mocked(useAnafEnrichImport).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  } as never);
  vi.mocked(useResumeImportReprocessErrors).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  } as never);
}

function setupSubQueries() {
  vi.mocked(useImportEntities).mockReturnValue({
    isPending: false,
    isError: false,
    error: null,
    data: emptyList,
    refetch: vi.fn(),
  } as never);
  vi.mocked(useImportRows).mockReturnValue({
    isPending: false,
    isError: false,
    error: null,
    data: emptyList,
    refetch: vi.fn(),
  } as never);
  vi.mocked(useImportReprocessErrors).mockReturnValue({
    isPending: false,
    isError: false,
    error: null,
    data: emptyList,
    refetch: vi.fn(),
  } as never);
  vi.mocked(useImportQuarantine).mockReturnValue({
    isPending: false,
    isError: false,
    error: null,
    data: emptyList,
    refetch: vi.fn(),
  } as never);
}

describe("ImportDetail (RTL + hook mock)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMutations();
    setupSubQueries();
  });

  it("în timpul încărcării detaliului afișează titlul paginii", () => {
    vi.mocked(useImportDetail).mockReturnValue({
      isPending: true,
      isError: false,
      error: null,
      data: undefined,
      refetch: vi.fn(),
    } as never);
    wrap(<ImportDetail />);
    expect(screen.getByText("Import Detail")).toBeInTheDocument();
  });

  it("la eroare API afișează mesajul din query", () => {
    vi.mocked(useImportDetail).mockReturnValue({
      isPending: false,
      isError: true,
      error: new Error("batch indisponibil"),
      data: undefined,
      refetch: vi.fn(),
    } as never);
    wrap(<ImportDetail />);
    expect(screen.getByText(/Eroare la încărcarea datelor/i)).toBeInTheDocument();
    expect(screen.getByText(/batch indisponibil/)).toBeInTheDocument();
  });

  it("cu batch încărcat afișează fișierul și statusul; Pause Import apelează mutația", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useImportDetail).mockReturnValue({
      isPending: false,
      isError: false,
      error: null,
      data: { success: true, data: detailPayload },
      refetch,
    } as never);

    const pauseMutate = vi.fn().mockResolvedValue({});
    vi.mocked(usePauseImportBatch).mockReturnValue({
      mutateAsync: pauseMutate,
      isPending: false,
    } as never);

    wrap(<ImportDetail />);

    expect(await screen.findByText("contacts-enterprise.csv")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Progres pipeline/i }));
    expect(await screen.findByTestId("pipeline-progress-stub")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Pause Import/i }));
    await waitFor(() => {
      expect(pauseMutate).toHaveBeenCalledWith("batch-rtl-1");
    });
    expect(refetch).toHaveBeenCalled();
  });
});
