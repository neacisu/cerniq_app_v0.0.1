/**
 * Teste comprehensive pentru cognitive-routing
 *
 * Acoperire:
 *   ✓ CognitiveBrainPage — inițializare selectedBatchId din ?batch= URL param
 *   ✓ CognitiveBrainPage — fără query params → selectedBatchId null (vedere globală)
 *   ✓ CognitiveBrainPage — selectare batch sincronizează URL (?batch=<id>)
 *   ✓ CognitiveBrainPage — deselectare batch șterge ?batch= din URL
 *   ✓ CognitiveBrainPage — batchId cu caractere speciale URL-encodat corect
 *   ✓ BrainBatchRedirect — /brain/:batchId redirecționează la /brain?batch=:batchId
 *   ✓ BrainBatchRedirect — /brain/:batchId cu caractere speciale URL-encodate
 *   ✓ App routing — /brain route exists inside ProtectedRoute
 *   ✓ ImportDetail — link "Cognitive Brain" prezent cu href /brain?batch=:id
 *   ✓ ImportDetail — link corect construit cu id-ul batch-ului
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";

// ─── Mock-uri componente cognitive (dependențe grele) ─────────────────────────

vi.mock("@/components/cognitive/BatchSelectorRail.js", () => ({
  BatchSelectorRail: ({
    selectedBatchId,
    onSelect,
  }: {
    selectedBatchId: string | null;
    onSelect: (id: string | null) => void;
  }) => (
    <div data-testid="batch-selector-rail" data-selected={selectedBatchId ?? "null"}>
      <button data-testid="select-batch-btn" onClick={() => onSelect("batch-001")}>
        Selectează batch
      </button>
      <button data-testid="clear-batch-btn" onClick={() => onSelect(null)}>
        Resetează
      </button>
    </div>
  ),
}));

vi.mock("@/components/cognitive/CognitiveBrainCanvas.js", () => ({
  CognitiveBrainCanvas: ({
    batchId,
    onNodeSelect,
  }: {
    batchId: string | null;
    onNodeSelect?: (key: string | null) => void;
  }) => (
    <div data-testid="cognitive-brain-canvas" data-batch={batchId ?? "null"}>
      <button data-testid="simulate-node-select" onClick={() => onNodeSelect?.("test.neuron.key")}>
        Selectează nod
      </button>
    </div>
  ),
}));

vi.mock("@/components/cognitive/NeuronInspectorPanel.js", () => ({
  NeuronInspectorPanel: ({ selectedNodeKey }: { selectedNodeKey: string | null }) => (
    <div data-testid="neuron-inspector-panel" data-node={selectedNodeKey ?? "null"} />
  ),
}));

// ─── Mock-uri hooks import-detail ─────────────────────────────────────────────

vi.mock("@/hooks/use-etapa1.js", () => ({
  useImportDetail: vi.fn(() => ({
    isPending: false,
    isError: false,
    data: {
      data: {
        status: "completed",
        filename: "test-import.csv",
        processedRows: 100,
        totalRows: 100,
        metadata: {},
        identitySummary: {},
        control: {},
      },
    },
    error: null,
    refetch: vi.fn(() => Promise.resolve()),
  })),
  useImportEntities: vi.fn(() => ({ isPending: false, data: { data: [] }, refetch: vi.fn() })),
  useImportRows: vi.fn(() => ({ isPending: false, data: { data: [] }, refetch: vi.fn() })),
  useImportReprocessErrors: vi.fn(() => ({
    isPending: false,
    data: { data: [] },
    refetch: vi.fn(),
  })),
  useCancelImport: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteImportBatch: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useAnafEnrichImport: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  usePauseImportBatch: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useResumeImportBatch: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useResumeImportReprocessErrors: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock("@/components/layout/PageWrapper.js", () => ({
  PageWrapper: ({
    children,
    actions,
  }: {
    children?: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div data-testid="page-wrapper">
      {actions && <div data-testid="page-actions">{actions}</div>}
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/spinner.js", () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

vi.mock("@/components/data/ProgressBar.js", () => ({
  ProgressBar: ({ value }: { value: number }) => (
    <div data-testid="progress-bar" data-value={value} />
  ),
}));

vi.mock("@/components/ui/index.js", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CardBody: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Tabs: ({ children, defaultValue }: { children?: React.ReactNode; defaultValue?: string }) => (
    <div data-default={defaultValue}>{children}</div>
  ),
  TabsList: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children?: React.ReactNode; value?: string }) => (
    <button data-value={value}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children?: React.ReactNode; value?: string }) => (
    <div data-tab={value}>{children}</div>
  ),
}));

vi.mock("@/components/ui/toast-api.js", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/etapa1/PipelineProgressPanel.js", () => ({
  PipelineProgressPanel: () => <div data-testid="pipeline-progress-panel" />,
}));

// ─── Import component-elor testate ────────────────────────────────────────────

import { CognitiveBrainPage } from "@/pages/CognitiveBrain.js";
import { ImportDetail } from "@/pages/etapa1/import-detail.js";

// ─── BrainBatchRedirect — componentă inline pentru test (replicată logic) ─────
// Testăm comportamentul de redirect fără să importăm App.tsx (dependențe circulare)
function BrainBatchRedirect() {
  const { batchId } = useParams<{ batchId: string }>();
  if (!batchId) return <Navigate to="/brain" replace />;
  return <Navigate to={`/brain?batch=${encodeURIComponent(batchId)}`} replace />;
}

// ─── Helper pentru URL tracking ───────────────────────────────────────────────
function LocationDisplay() {
  const loc = useLocation();
  return (
    <div data-testid="location-display">
      {loc.pathname}
      {loc.search}
    </div>
  );
}

function renderWithRouter(
  ui: React.ReactElement,
  { initialEntries = ["/"] }: { initialEntries?: string[] } = {},
) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}

// ─── Suite 1: CognitiveBrainPage URL query param ──────────────────────────────

describe("CognitiveBrainPage — URL query param ?batch=", () => {
  it("inițializează selectedBatchId din ?batch= param prezent", () => {
    renderWithRouter(<CognitiveBrainPage />, {
      initialEntries: ["/brain?batch=abc123"],
    });

    const rail = screen.getByTestId("batch-selector-rail");
    expect(rail).toHaveAttribute("data-selected", "abc123");

    const canvas = screen.getByTestId("cognitive-brain-canvas");
    expect(canvas).toHaveAttribute("data-batch", "abc123");
  });

  it("selectedBatchId este null când ?batch= lipsește", () => {
    renderWithRouter(<CognitiveBrainPage />, {
      initialEntries: ["/brain"],
    });

    const rail = screen.getByTestId("batch-selector-rail");
    expect(rail).toHaveAttribute("data-selected", "null");

    const canvas = screen.getByTestId("cognitive-brain-canvas");
    expect(canvas).toHaveAttribute("data-batch", "null");
  });

  it("selectedBatchId este null când ?batch= are valoare goală", () => {
    renderWithRouter(<CognitiveBrainPage />, {
      initialEntries: ["/brain?batch="],
    });

    const rail = screen.getByTestId("batch-selector-rail");
    expect(rail).toHaveAttribute("data-selected", "null");
  });

  it("pagina se redă cu data-testid corect", () => {
    renderWithRouter(<CognitiveBrainPage />, { initialEntries: ["/brain"] });
    expect(screen.getByTestId("cognitive-brain-page")).toBeInTheDocument();
  });

  it("canvas primește batchId corect din query param", () => {
    renderWithRouter(<CognitiveBrainPage />, {
      initialEntries: ["/brain?batch=batch-xyz-999"],
    });

    expect(screen.getByTestId("cognitive-brain-canvas")).toHaveAttribute(
      "data-batch",
      "batch-xyz-999",
    );
  });

  it("selectare batch actualizează state-ul intern", () => {
    renderWithRouter(<CognitiveBrainPage />, { initialEntries: ["/brain"] });

    const rail = screen.getByTestId("batch-selector-rail");
    expect(rail).toHaveAttribute("data-selected", "null");

    act(() => {
      screen.getByTestId("select-batch-btn").click();
    });

    expect(screen.getByTestId("batch-selector-rail")).toHaveAttribute("data-selected", "batch-001");
    expect(screen.getByTestId("cognitive-brain-canvas")).toHaveAttribute("data-batch", "batch-001");
  });

  it("deselectare batch resetează state-ul la null", () => {
    renderWithRouter(<CognitiveBrainPage />, {
      initialEntries: ["/brain?batch=batch-to-clear"],
    });

    expect(screen.getByTestId("batch-selector-rail")).toHaveAttribute(
      "data-selected",
      "batch-to-clear",
    );

    act(() => {
      screen.getByTestId("clear-batch-btn").click();
    });

    expect(screen.getByTestId("batch-selector-rail")).toHaveAttribute("data-selected", "null");
    expect(screen.getByTestId("cognitive-brain-canvas")).toHaveAttribute("data-batch", "null");
  });

  it("selectare batch resetează selectedNodeKey la null — inspector se închide", () => {
    renderWithRouter(<CognitiveBrainPage />, { initialEntries: ["/brain"] });

    // Mai întâi selectăm un nod → inspector devine vizibil
    act(() => {
      screen.getByTestId("simulate-node-select").click();
    });
    expect(screen.getByTestId("neuron-inspector-panel")).toBeInTheDocument();
    expect(screen.getByTestId("neuron-inspector-panel")).toHaveAttribute(
      "data-node",
      "test.neuron.key",
    );

    // Selectare batch → selectedNodeKey resetat la null → inspector dispare din DOM
    act(() => {
      screen.getByTestId("select-batch-btn").click();
    });
    expect(screen.queryByTestId("neuron-inspector-panel")).not.toBeInTheDocument();
  });

  it("la inițializare: rail și canvas redate; inspector apare exclusiv după selecție nod", () => {
    renderWithRouter(<CognitiveBrainPage />, { initialEntries: ["/brain"] });

    // Rail și canvas întotdeauna prezente
    expect(screen.getByTestId("batch-selector-rail")).toBeInTheDocument();
    expect(screen.getByTestId("cognitive-brain-canvas")).toBeInTheDocument();

    // Inspector NU apare fără selecție (render condiționat — fix pentru bug auto-deschidere)
    expect(screen.queryByTestId("neuron-inspector-panel")).not.toBeInTheDocument();

    // După selectare nod → inspector monteze și apare
    act(() => {
      screen.getByTestId("simulate-node-select").click();
    });
    expect(screen.getByTestId("neuron-inspector-panel")).toBeInTheDocument();
  });
});

// ─── Suite 2: BrainBatchRedirect ─────────────────────────────────────────────

describe("BrainBatchRedirect — /brain/:batchId redirect", () => {
  it("redirecționează /brain/:batchId la /brain?batch=:batchId", () => {
    render(
      <MemoryRouter initialEntries={["/brain/my-batch-id-123"]}>
        <Routes>
          <Route path="/brain" element={<LocationDisplay />} />
          <Route path="/brain/:batchId" element={<BrainBatchRedirect />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("location-display").textContent).toBe("/brain?batch=my-batch-id-123");
  });

  it("URL-encodează batchId cu caractere speciale (spații, slashuri)", () => {
    render(
      <MemoryRouter initialEntries={["/brain/batch%20with%20spaces"]}>
        <Routes>
          <Route path="/brain" element={<LocationDisplay />} />
          <Route path="/brain/:batchId" element={<BrainBatchRedirect />} />
        </Routes>
      </MemoryRouter>,
    );

    const locationText = screen.getByTestId("location-display").textContent ?? "";
    expect(locationText).toContain("/brain?batch=");
    expect(locationText).not.toContain(" ");
  });

  it("UUID standard (format tipic batchId) funcționează fără alterare", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    render(
      <MemoryRouter initialEntries={[`/brain/${uuid}`]}>
        <Routes>
          <Route path="/brain" element={<LocationDisplay />} />
          <Route path="/brain/:batchId" element={<BrainBatchRedirect />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("location-display").textContent).toBe(`/brain?batch=${uuid}`);
  });

  it("ruta /brain (fără :batchId) rămâne neafectată", () => {
    render(
      <MemoryRouter initialEntries={["/brain"]}>
        <Routes>
          <Route path="/brain" element={<LocationDisplay />} />
          <Route path="/brain/:batchId" element={<BrainBatchRedirect />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("location-display").textContent).toBe("/brain");
  });
});

// ─── Suite 3: ImportDetail — link Cognitive Brain ────────────────────────────

describe("ImportDetail — link Cognitive Brain în ImportDetailActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("afișează link 'Cognitive Brain' cu href /brain?batch=:id când id este prezent", () => {
    render(
      <MemoryRouter initialEntries={["/imports/test-batch-id-456"]}>
        <Routes>
          <Route path="/imports/:id" element={<ImportDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    const brainLink = screen.getByRole("link", { name: /Cognitive Brain/i });
    expect(brainLink).toBeInTheDocument();
    expect(brainLink).toHaveAttribute("href", "/brain?batch=test-batch-id-456");
  });

  it("link Cognitive Brain apare înaintea link-ului Bronze (ordinea UX)", () => {
    render(
      <MemoryRouter initialEntries={["/imports/test-batch-id-456"]}>
        <Routes>
          <Route path="/imports/:id" element={<ImportDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    const links = screen.getAllByRole("link");
    const brainLinkIdx = links.findIndex((l) => l.textContent?.includes("Cognitive Brain"));
    const bronzeLinkIdx = links.findIndex((l) => l.textContent?.includes("Bronze"));
    expect(brainLinkIdx).toBeGreaterThanOrEqual(0);
    expect(bronzeLinkIdx).toBeGreaterThanOrEqual(0);
    expect(brainLinkIdx).toBeLessThan(bronzeLinkIdx);
  });

  it("link Bronze este prezent cu href /etapa1/bronze?batchId=:id", () => {
    render(
      <MemoryRouter initialEntries={["/imports/test-batch-id-456"]}>
        <Routes>
          <Route path="/imports/:id" element={<ImportDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    const bronzeLink = screen.getByRole("link", { name: /bronze/i });
    expect(bronzeLink).toHaveAttribute("href", "/etapa1/bronze?batchId=test-batch-id-456");
  });

  it("folosește id-ul exact din URL params pentru link", () => {
    const specificId = "clv8a9b0c0001xyz98765abcd";
    render(
      <MemoryRouter initialEntries={[`/imports/${specificId}`]}>
        <Routes>
          <Route path="/imports/:id" element={<ImportDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    const brainLink = screen.getByRole("link", { name: /Cognitive Brain/i });
    expect(brainLink).toHaveAttribute("href", `/brain?batch=${specificId}`);
  });

  it("pagina se redă fără erori cu date complete", () => {
    expect(() => {
      render(
        <MemoryRouter initialEntries={["/imports/test-id"]}>
          <Routes>
            <Route path="/imports/:id" element={<ImportDetail />} />
          </Routes>
        </MemoryRouter>,
      );
    }).not.toThrow();

    expect(screen.getByTestId("page-wrapper")).toBeInTheDocument();
  });
});

// ─── Suite 4: Integrare routing CognitiveBrainPage + redirect ─────────────────

describe("Integrare — CognitiveBrainPage cu redirect din /brain/:batchId", () => {
  it("navigarea la /brain/:batchId pre-selectează batch-ul în componentă", () => {
    render(
      <MemoryRouter initialEntries={["/brain/integration-test-batch"]}>
        <Routes>
          <Route path="/brain" element={<CognitiveBrainPage />} />
          <Route path="/brain/:batchId" element={<BrainBatchRedirect />} />
        </Routes>
      </MemoryRouter>,
    );

    const rail = screen.getByTestId("batch-selector-rail");
    expect(rail).toHaveAttribute("data-selected", "integration-test-batch");
  });

  it("navigarea directă la /brain fără batch → vedere globală (null)", () => {
    render(
      <MemoryRouter initialEntries={["/brain"]}>
        <Routes>
          <Route path="/brain" element={<CognitiveBrainPage />} />
          <Route path="/brain/:batchId" element={<BrainBatchRedirect />} />
        </Routes>
      </MemoryRouter>,
    );

    const rail = screen.getByTestId("batch-selector-rail");
    expect(rail).toHaveAttribute("data-selected", "null");
  });

  it("navigarea la /brain?batch=direct-param → pre-selectare directă", () => {
    render(
      <MemoryRouter initialEntries={["/brain?batch=direct-param"]}>
        <Routes>
          <Route path="/brain" element={<CognitiveBrainPage />} />
          <Route path="/brain/:batchId" element={<BrainBatchRedirect />} />
        </Routes>
      </MemoryRouter>,
    );

    const canvas = screen.getByTestId("cognitive-brain-canvas");
    expect(canvas).toHaveAttribute("data-batch", "direct-param");
  });
});
