/**
 * Tests for BatchSelectorRail — left rail import batch selector
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BatchSelectorRail } from "@/components/cognitive/BatchSelectorRail.js";

vi.mock("@/lib/api-url.js", () => ({ getApiBase: () => "http://127.0.0.1:64010" }));

const { mockApiGet } = vi.hoisted(() => ({ mockApiGet: vi.fn() }));

vi.mock("@/lib/api.js", () => ({
  api: { get: mockApiGet, post: vi.fn(), put: vi.fn() },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(msg: string, status = 500) {
      super(msg);
      this.status = status;
    }
  },
}));

const MOCK_BATCHES = [
  {
    id: "batch-001",
    originalName: "import-jan.csv",
    status: "COMPLETED",
    createdAt: new Date("2025-01-10T12:00:00Z").toISOString(),
    totalRows: 500,
  },
  {
    id: "batch-002",
    originalName: "import-feb.xlsx",
    status: "PROCESSING",
    createdAt: new Date("2025-02-15T08:00:00Z").toISOString(),
    totalRows: 1200,
  },
];

beforeEach(() => {
  mockApiGet.mockResolvedValue({ data: MOCK_BATCHES, total: 2 });
});

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderRail(selectedBatchId: string | null = null, onSelect = vi.fn()) {
  const qc = makeQC();
  return render(
    <QueryClientProvider client={qc}>
      <BatchSelectorRail selectedBatchId={selectedBatchId} onSelect={onSelect} />
    </QueryClientProvider>,
  );
}

describe("BatchSelectorRail", () => {
  it("renders with data-testid", () => {
    renderRail();
    expect(screen.getByTestId("batch-selector-rail")).toBeInTheDocument();
  });

  it("shows Cognitive Brain title", () => {
    renderRail();
    expect(screen.getByText("Cognitive Brain")).toBeInTheDocument();
  });

  it("shows 'Vedere globală' option always", () => {
    renderRail();
    expect(screen.getByText("Vedere globală")).toBeInTheDocument();
  });

  it("marks 'Vedere globală' as active when no batch selected", () => {
    renderRail(null);
    expect(screen.getByText("ACTIV")).toBeInTheDocument();
  });

  it("calls onSelect(null) when 'Vedere globală' is clicked", () => {
    const onSelect = vi.fn();
    renderRail("batch-001", onSelect);
    fireEvent.click(screen.getByText("Vedere globală"));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("shows batch items after loading", async () => {
    renderRail();
    await waitFor(() => {
      expect(screen.getByTestId("batch-item-batch-001")).toBeInTheDocument();
    });
    expect(screen.getByTestId("batch-item-batch-002")).toBeInTheDocument();
  });

  it("calls onSelect with batch id when item is clicked", async () => {
    const onSelect = vi.fn();
    renderRail(null, onSelect);
    await waitFor(() => screen.getByTestId("batch-item-batch-001"));
    fireEvent.click(screen.getByTestId("batch-item-batch-001"));
    expect(onSelect).toHaveBeenCalledWith("batch-001");
  });

  it("highlights selected batch item with b5 border", async () => {
    renderRail("batch-001");
    await waitFor(() => screen.getByTestId("batch-item-batch-001"));
    const item = screen.getByTestId("batch-item-batch-001");
    expect(item.style.borderLeft).toContain("var(--color-b5)");
  });

  it("shows search input", () => {
    renderRail();
    expect(screen.getByPlaceholderText("Caută batch…")).toBeInTheDocument();
  });

  it("filters batches by search text", async () => {
    renderRail();
    await waitFor(() => screen.getByTestId("batch-item-batch-001"));

    fireEvent.change(screen.getByPlaceholderText("Caută batch…"), {
      target: { value: "feb" },
    });

    expect(screen.queryByTestId("batch-item-batch-001")).not.toBeInTheDocument();
    expect(screen.getByTestId("batch-item-batch-002")).toBeInTheDocument();
  });

  it("shows 'Niciun rezultat' when search has no matches", async () => {
    renderRail();
    await waitFor(() => screen.getByTestId("batch-item-batch-001"));

    fireEvent.change(screen.getByPlaceholderText("Caută batch…"), {
      target: { value: "xyznonexistent" },
    });

    expect(screen.getByText("Niciun rezultat")).toBeInTheDocument();
  });

  it("shows reset button when a batch is selected", () => {
    renderRail("batch-001");
    expect(screen.getByText("Resetează selecția")).toBeInTheDocument();
  });

  it("does not show reset button when no batch selected", () => {
    renderRail(null);
    expect(screen.queryByText("Resetează selecția")).not.toBeInTheDocument();
  });

  it("calls onSelect(null) when reset button is clicked", () => {
    const onSelect = vi.fn();
    renderRail("batch-001", onSelect);
    fireEvent.click(screen.getByText("Resetează selecția"));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("shows 'Niciun import' when API returns empty list", async () => {
    mockApiGet.mockResolvedValueOnce({ data: [], total: 0 });
    renderRail();
    await waitFor(() => {
      expect(screen.getByTestId("batch-empty-state")).toBeInTheDocument();
    });
  });

  it("shows 'Istoric indisponibil' on API failure", async () => {
    mockApiGet.mockRejectedValue(new Error("Network error"));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: 0, retryDelay: 0 } } });
    render(
      <QueryClientProvider client={qc}>
        <BatchSelectorRail selectedBatchId={null} onSelect={vi.fn()} />
      </QueryClientProvider>,
    );
    await waitFor(
      () => {
        expect(screen.getByText("Istoric indisponibil")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
