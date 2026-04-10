/**
 * Etapa 1 — pagini checklist: render + stări hook mock (formă envelope API), fără text business inventat.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import React from "react";

vi.mock("@/components/drawers/BronzeContactDrawer.js", () => ({
  BronzeContactDrawer: () => null,
}));
vi.mock("@/components/drawers/SilverCompanyDrawer.js", () => ({
  SilverCompanyDrawer: () => null,
}));
vi.mock("@/components/drawers/GoldCompanyDrawer.js", () => ({
  GoldCompanyDrawer: () => null,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/ui/toast-api.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/components/forms/ImportMappingForm.js", () => ({
  ImportMappingForm: ({
    targetFields,
  }: {
    targetFields?: ReadonlyArray<{ label: string; value: string }>;
  }) => (
    <div data-testid="import-mapping-form-stub">
      {targetFields?.map((f) => (
        <span key={f.value}>{f.label}</span>
      ))}
    </div>
  ),
}));

vi.mock("@/lib/etapa2-api.js", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/etapa2-api.js")>();
  return {
    ...mod,
    createOutreachLeadsFromGold: vi.fn(() =>
      Promise.resolve({
        success: true,
        data: {
          created: 1,
          alreadyExists: 0,
          rejectedDnc: 0,
          rejectedNoContact: 0,
          notFound: 0,
        },
      }),
    ),
  };
});

vi.mock("@/hooks/use-etapa1.js", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/hooks/use-etapa1.js")>();
  return {
    ...mod,
    useBronzeContacts: vi.fn(mod.useBronzeContacts),
    useReprocessBronze: vi.fn(mod.useReprocessBronze),
    useSilverCompanies: vi.fn(mod.useSilverCompanies),
    useGoldCompanies: vi.fn(mod.useGoldCompanies),
    useDedupCandidates: vi.fn(mod.useDedupCandidates),
    useDecideDedup: vi.fn(mod.useDecideDedup),
    useQueueStatuses: vi.fn(mod.useQueueStatuses),
    usePauseQueue: vi.fn(mod.usePauseQueue),
    useResumeQueue: vi.fn(mod.useResumeQueue),
    useSilverEnrichmentLog: vi.fn(mod.useSilverEnrichmentLog),
    useApprovals: vi.fn(mod.useApprovals),
    useUploadImport: vi.fn(mod.useUploadImport),
    useBronzeContactDetail: vi.fn(mod.useBronzeContactDetail),
    useSilverCompanyDetail: vi.fn(mod.useSilverCompanyDetail),
    useTriggerSilverEnrich: vi.fn(mod.useTriggerSilverEnrich),
    useTriggerSilverPromote: vi.fn(mod.useTriggerSilverPromote),
    useGoldCompanyDetail: vi.fn(mod.useGoldCompanyDetail),
    useGoldCompanyJourney: vi.fn(mod.useGoldCompanyJourney),
    useApprovalDetail: vi.fn(mod.useApprovalDetail),
    useDecideApproval: vi.fn(mod.useDecideApproval),
    useEscalateApproval: vi.fn(mod.useEscalateApproval),
    useImportDetail: vi.fn(mod.useImportDetail),
    useMappingTargets: vi.fn(mod.useMappingTargets),
    useSaveImportMapping: vi.fn(mod.useSaveImportMapping),
  };
});

import {
  useApprovals,
  useBronzeContactDetail,
  useBronzeContacts,
  useDecideApproval,
  useDecideDedup,
  useDedupCandidates,
  useGoldCompanies,
  useGoldCompanyDetail,
  useGoldCompanyJourney,
  useImportDetail,
  useMappingTargets,
  usePauseQueue,
  useQueueStatuses,
  useReprocessBronze,
  useResumeQueue,
  useSaveImportMapping,
  useSilverCompanies,
  useSilverEnrichmentLog,
  useSilverCompanyDetail,
  useTriggerSilverEnrich,
  useTriggerSilverPromote,
  useUploadImport,
  useApprovalDetail,
  useEscalateApproval,
} from "@/hooks/use-etapa1.js";
import { Bronze } from "@/pages/etapa1/bronze.js";
import { Silver } from "@/pages/etapa1/silver.js";
import { SilverContacts } from "@/pages/etapa1/silver-contacts.js";
import { Gold } from "@/pages/etapa1/gold.js";
import { GoldContacts } from "@/pages/etapa1/gold-contacts.js";
import { SilverDedup } from "@/pages/etapa1/silver-dedup.js";
import { EnrichmentQueues } from "@/pages/etapa1/enrichment-queues.js";
import { EnrichmentLogs } from "@/pages/etapa1/enrichment-logs.js";
import { SettingsMappings } from "@/pages/etapa1/settings-mappings.js";
import { SettingsIntegrations } from "@/pages/etapa1/settings-integrations.js";
import { Approvals } from "@/pages/etapa1/approvals.js";
import { ImportNew } from "@/pages/etapa1/import-new.js";
import { BronzeDetail } from "@/pages/etapa1/bronze-detail.js";
import { SilverCompanyDetail } from "@/pages/etapa1/silver-company-detail.js";
import { GoldCompanyDetail } from "@/pages/etapa1/gold-company-detail.js";
import { ApprovalReview } from "@/pages/etapa1/approval-review.js";
import { ImportMapping } from "@/pages/etapa1/import-mapping.js";
import { GoldSelectColumnHeader } from "@/pages/etapa1/gold-select-column.js";
import { createOutreachLeadsFromGold } from "@/lib/etapa2-api.js";

function qList<T extends Record<string, unknown>>(
  rows: T[],
  meta?: { total?: number; limit?: number; offset?: number },
) {
  return {
    data: {
      success: true as const,
      data: rows,
      meta: {
        total: meta?.total ?? rows.length,
        limit: meta?.limit ?? 25,
        offset: meta?.offset ?? 0,
      },
    },
    isPending: false,
    isError: false,
    error: null,
    isFetching: false,
    status: "success" as const,
    fetchStatus: "idle" as const,
    refetch: vi.fn().mockResolvedValue({}),
  };
}

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("Etapa 1 pages (RTL + hook mock)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useReprocessBronze).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useDecideDedup).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(usePauseQueue).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useResumeQueue).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useDecideApproval).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useEscalateApproval).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useTriggerSilverEnrich).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useTriggerSilverPromote).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useSaveImportMapping).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as never);
    vi.mocked(useUploadImport).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isError: false,
      error: null,
      isPending: false,
    } as never);
  });

  it("Bronze: tabel din date mock + Reproceseaza apelează mutate", async () => {
    const mutate = vi.fn();
    vi.mocked(useReprocessBronze).mockReturnValue({
      mutate,
      mutateAsync: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useBronzeContacts).mockReturnValue(
      qList([
        {
          id: "b1",
          extractedName: "Exemplu SRL",
          extractedCui: "RO1",
          sourceType: "csv",
          processingStatus: "pending",
        },
      ]) as never,
    );
    const user = userEvent.setup();
    wrap(
      <MemoryRouter>
        <Bronze />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Exemplu SRL")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Reproceseaza/i }));
    expect(mutate).toHaveBeenCalledWith("b1");
  });

  it("Silver: randări din răspuns listă goală (empty state)", async () => {
    vi.mocked(useSilverCompanies).mockReturnValue(qList([]) as never);
    wrap(
      <MemoryRouter>
        <Silver />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Nu exista date.")).toBeInTheDocument();
  });

  it("Silver contacts: coloană denumire din API mock", async () => {
    vi.mocked(useSilverCompanies).mockReturnValue(
      qList([
        {
          id: "s1",
          denumire: "Companie Silver",
          cui: "CUI1",
          nrRegCom: null,
          enrichmentStatus: "COMPLETE",
          promotionStatus: "ELIGIBLE",
          totalQualityScore: 80,
        },
      ]) as never,
    );
    wrap(
      <MemoryRouter>
        <SilverContacts />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Companie Silver")).toBeInTheDocument();
  });

  it("Gold: Refresh apelează refetch pe hook", async () => {
    const refetch = vi.fn().mockResolvedValue({});
    vi.mocked(useGoldCompanies).mockReturnValue({
      ...qList([
        {
          id: "g1",
          denumire: "Gold SA",
          currentState: "COLD",
          judetCod: "AB",
          cifraAfaceri: "1000",
        },
      ]),
      refetch,
    } as never);
    const user = userEvent.setup();
    wrap(
      <MemoryRouter>
        <Gold />
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole("button", { name: /^Refresh$/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("Gold: adăugare în outreach folosește createOutreachLeadsFromGold", async () => {
    vi.mocked(useGoldCompanies).mockReturnValue(
      qList([
        {
          id: "g1",
          denumire: "Gold SA",
          currentState: "COLD",
          judetCod: null,
          cifraAfaceri: null,
        },
      ]) as never,
    );
    const user = userEvent.setup();
    wrap(
      <MemoryRouter>
        <Gold />
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole("checkbox", { name: /Selectează toate pe pagină/i }));
    const addBtn = await screen.findByRole("button", { name: /Adaugă la Outreach/i });
    await user.click(addBtn);
    expect(vi.mocked(createOutreachLeadsFromGold)).toHaveBeenCalledWith(["g1"]);
  });

  it("Gold contacts: folosește același hook ca lista principală Gold companies", async () => {
    vi.mocked(useGoldCompanies).mockReturnValue(
      qList([
        {
          id: "g2",
          denumire: "Contact Gold",
          currentState: "ENGAGED",
          judetCod: null,
          cifraAfaceri: null,
        },
      ]) as never,
    );
    wrap(
      <MemoryRouter>
        <GoldContacts />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Contact Gold")).toBeInTheDocument();
  });

  it("Silver dedup: buton decizie declanșează mutate", async () => {
    const mutate = vi.fn();
    vi.mocked(useDecideDedup).mockReturnValue({ mutate, isPending: false } as never);
    vi.mocked(useDedupCandidates).mockReturnValue(
      qList([
        {
          id: "d1",
          status: "pending",
          companyAData: { denumire: "A", cui: "1" },
          companyBData: { denumire: "B", cui: "2" },
        },
      ]) as never,
    );
    const user = userEvent.setup();
    wrap(
      <MemoryRouter>
        <SilverDedup />
      </MemoryRouter>,
    );
    const mergeButtons = await screen.findAllByRole("button", { name: /Merge/i });
    const mergeBtn = mergeButtons[0];
    expect(mergeBtn).toBeDefined();
    await user.click(mergeBtn);
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "d1", decision: "merge" }),
      expect.anything(),
    );
  });

  it("Enrichment queues: randare cozi din GET mock + Pauză", async () => {
    vi.mocked(useQueueStatuses).mockReturnValue(
      qList([
        {
          name: "silver-enrich",
          waiting: 2,
          active: 0,
          completed: 10,
          failed: 0,
          delayed: 0,
          paused: false,
        },
      ]) as never,
    );
    const pauseAsync = vi.fn().mockResolvedValue({});
    vi.mocked(usePauseQueue).mockReturnValue({
      mutateAsync: pauseAsync,
      isPending: false,
    } as never);
    const user = userEvent.setup();
    wrap(
      <MemoryRouter>
        <EnrichmentQueues />
      </MemoryRouter>,
    );
    const silverEnrich = await screen.findAllByText("silver-enrich");
    expect(silverEnrich.length).toBeGreaterThanOrEqual(1);
    await user.click(screen.getByRole("button", { name: /^Pause$/i }));
    expect(pauseAsync).toHaveBeenCalledWith("silver-enrich");
  });

  it("Enrichment logs: empty state fără entityId", async () => {
    vi.mocked(useSilverEnrichmentLog).mockReturnValue(
      qList([], { total: 0, limit: 50, offset: 0 }) as never,
    );
    wrap(
      <MemoryRouter>
        <EnrichmentLogs />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Niciun log de enrichment/i)).toBeInTheDocument();
  });

  it("Settings mappings: după delay local afișează formularul", () => {
    vi.useFakeTimers();
    wrap(
      <MemoryRouter>
        <SettingsMappings />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /Settings - Mappings/i })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByText(/Configurare Mapping-uri Default/i)).toBeInTheDocument();
  });

  it("Settings integrations: listă statică ghid (ANAF)", () => {
    wrap(
      <MemoryRouter>
        <SettingsIntegrations />
      </MemoryRouter>,
    );
    expect(screen.getByText("ANAF")).toBeInTheDocument();
    expect(screen.getByText(/api\.anaf\.ro/i)).toBeInTheDocument();
  });

  it("Approvals: tab pending fără task-uri mock", async () => {
    vi.mocked(useApprovals).mockImplementation(() => qList([]) as never);
    wrap(
      <MemoryRouter>
        <Approvals />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Nu există aprobări în așteptare/i)).toBeInTheDocument();
  });

  it("Import nou: succes upload afișează mesaj din nume fișier", async () => {
    const user = userEvent.setup();
    wrap(
      <MemoryRouter>
        <ImportNew />
      </MemoryRouter>,
    );
    const input = screen.getByLabelText(/Trage fisiere aici sau browse/i, {
      selector: "input",
    }) as HTMLInputElement;
    const file = new File(["a"], "lot.csv", { type: "text/csv" });
    await user.upload(input, file);
    expect(await screen.findByText(/Import creat: lot\.csv/i)).toBeInTheDocument();
  });

  it("Bronze detail: câmpuri din contact mock", async () => {
    vi.mocked(useBronzeContactDetail).mockReturnValue({
      data: {
        success: true,
        data: {
          id: "b1",
          extractedName: "Detaliu Bronze",
          extractedCui: "RO9",
          sourceType: "xlsx",
          processingStatus: "pending",
        },
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    wrap(
      <MemoryRouter initialEntries={["/bronze/contacts/b1"]}>
        <Routes>
          <Route path="/bronze/contacts/:id" element={<BronzeDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { level: 2, name: /^Detaliu Bronze$/ }),
    ).toBeInTheDocument();
  });

  it("Silver company detail: denumire din detail mock", async () => {
    vi.mocked(useSilverCompanyDetail).mockReturnValue({
      data: { success: true, data: { id: "s1", denumire: "Silver Detail SA", cui: "X" } },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useSilverEnrichmentLog).mockReturnValue(qList([]) as never);
    wrap(
      <MemoryRouter initialEntries={["/silver/companies/s1"]}>
        <Routes>
          <Route path="/silver/companies/:id" element={<SilverCompanyDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("Silver Detail SA")).toBeInTheDocument();
  });

  it("Gold company detail: denumire + journey mock", async () => {
    vi.mocked(useGoldCompanyDetail).mockReturnValue({
      data: {
        success: true,
        data: { id: "g1", denumire: "Gold Detail SA", currentState: "COLD" },
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useGoldCompanyJourney).mockReturnValue(qList([]) as never);
    wrap(
      <MemoryRouter initialEntries={["/gold/companies/g1"]}>
        <Routes>
          <Route path="/gold/companies/:id" element={<GoldCompanyDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("Gold Detail SA")).toBeInTheDocument();
  });

  it("Approval review: acțiune approve apelează mutateAsync", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useDecideApproval).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as never);
    vi.mocked(useApprovalDetail).mockReturnValue({
      data: {
        success: true,
        data: {
          id: "a1",
          status: "pending",
          approvalType: "merge",
          reason: "test",
        },
        entityData: null,
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue({}),
    } as never);
    const user = userEvent.setup();
    wrap(
      <MemoryRouter initialEntries={["/approvals/a1"]}>
        <Routes>
          <Route path="/approvals/:id" element={<ApprovalReview />} />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole("button", { name: /^Aproba$/i }));
    expect(mutateAsync).toHaveBeenCalledWith({ id: "a1", decision: "approve" });
  });

  it("Import mapping: randare ținte din GET mapping-targets mock", async () => {
    vi.mocked(useImportDetail).mockReturnValue({
      data: {
        success: true,
        data: {
          id: "imp1",
          metadata: { uploadConfig: { mapping: { col_a: "x" } } },
        },
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useMappingTargets).mockReturnValue({
      data: { success: true, data: [{ key: "denumire", label: "Denumire firmă" }] },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    wrap(
      <MemoryRouter initialEntries={["/imports/imp1/mapping"]}>
        <Routes>
          <Route path="/imports/:id/mapping" element={<ImportMapping />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("Denumire firmă")).toBeInTheDocument();
  });

  it("GoldSelectColumnHeader: toggle apelează handler", async () => {
    const onTogglePage = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<GoldSelectColumnHeader allPageSelected={false} onTogglePage={onTogglePage} />);
    await user.click(screen.getByRole("checkbox", { name: /Selectează toate pe pagină/i }));
    expect(onTogglePage).toHaveBeenCalled();
  });

  it("Approval review: spinner în încărcare", () => {
    vi.mocked(useApprovalDetail).mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    wrap(
      <MemoryRouter initialEntries={["/approvals/x1"]}>
        <Routes>
          <Route path="/approvals/:id" element={<ApprovalReview />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /Approval Review/i })).toBeInTheDocument();
    expect(document.querySelector(".animate-spin")).toBeTruthy();
  });

  it("Approval review: afișează eroare hook", () => {
    vi.mocked(useApprovalDetail).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("timeout"),
      refetch: vi.fn(),
    } as never);
    wrap(
      <MemoryRouter initialEntries={["/approvals/x1"]}>
        <Routes>
          <Route path="/approvals/:id" element={<ApprovalReview />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/timeout/)).toBeInTheDocument();
  });

  it("Approval review: tab Entity, SLA, merge/skip/escalare", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    const escAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useDecideApproval).mockReturnValue({ mutateAsync, isPending: false } as never);
    vi.mocked(useEscalateApproval).mockReturnValue({
      mutateAsync: escAsync,
      isPending: false,
    } as never);
    vi.mocked(useApprovalDetail).mockReturnValue({
      data: {
        success: true,
        data: {
          id: "a2",
          title: "Task titlu",
          status: "pending",
          approvalType: "dup",
          priorityLevel: "P1",
          dueAt: "2030-01-01T12:00:00.000Z",
        },
        entityData: { cui: "RO1" },
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue({}),
    } as never);
    const user = userEvent.setup();
    wrap(
      <MemoryRouter initialEntries={["/approvals/a2"]}>
        <Routes>
          <Route path="/approvals/:id" element={<ApprovalReview />} />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole("tab", { name: /Entity Context/i }));
    expect(screen.getByText(/"cui"/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Merge$/i }));
    await user.click(screen.getByRole("button", { name: /^Skip$/i }));
    expect(mutateAsync).toHaveBeenCalledWith({ id: "a2", decision: "merge" });
    expect(mutateAsync).toHaveBeenCalledWith({ id: "a2", decision: "skip" });
    await user.click(screen.getByRole("button", { name: /Escaleaza/i }));
    const ta = screen.getByPlaceholderText(/Descrie motivul escalarii/i);
    await user.type(ta, "motiv lung");
    await user.click(screen.getByRole("button", { name: /Confirma escalare/i }));
    expect(escAsync).toHaveBeenCalledWith({ id: "a2", reason: "motiv lung" });
  });

  it("Bronze detail: stare eroare API", () => {
    vi.mocked(useBronzeContactDetail).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("offline"),
      refetch: vi.fn(),
    } as never);
    wrap(
      <MemoryRouter initialEntries={["/bronze/contacts/bx"]}>
        <Routes>
          <Route path="/bronze/contacts/:id" element={<BronzeDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/offline/)).toBeInTheDocument();
  });

  it("Bronze detail: contact negăsit (fără id în răspuns)", () => {
    vi.mocked(useBronzeContactDetail).mockReturnValue({
      data: { success: true, data: {} },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    wrap(
      <MemoryRouter initialEntries={["/bronze/contacts/b0"]}>
        <Routes>
          <Route path="/bronze/contacts/:id" element={<BronzeDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/Contact negasit/i)).toBeInTheDocument();
  });

  it("Bronze detail: tab Metadata/Raw + câmpuri complexe + reprocesare", async () => {
    const mutate = vi.fn((_, { onError }: { onError?: () => void }) => {
      onError?.();
    });
    vi.mocked(useReprocessBronze).mockReturnValue({
      mutate,
      mutateAsync: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useBronzeContactDetail).mockReturnValue({
      data: {
        success: true,
        data: {
          id: "b99",
          extractedName: "Complex",
          processingStatus: 123,
          validationErrors: [{ code: "e1" }, "x"],
          createdAt: new Date("2020-01-01T00:00:00.000Z"),
          rawRowIndex: 5,
        },
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    const user = userEvent.setup();
    wrap(
      <MemoryRouter initialEntries={["/bronze/contacts/b99"]}>
        <Routes>
          <Route path="/bronze/contacts/:id" element={<BronzeDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole("tab", { name: /^Metadata$/i }));
    expect(screen.getByText(/Erori validare/i)).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /^Raw JSON$/i }));
    await user.click(screen.getByRole("button", { name: /Reproceseaza/i }));
    expect(mutate).toHaveBeenCalled();
  });

  it("Silver company detail: taburi + loguri enrichment + acțiuni", async () => {
    const enrich = vi.fn().mockResolvedValue({});
    const promote = vi.fn().mockResolvedValue({});
    vi.mocked(useTriggerSilverEnrich).mockReturnValue({
      mutateAsync: enrich,
      isPending: false,
    } as never);
    vi.mocked(useTriggerSilverPromote).mockReturnValue({
      mutateAsync: promote,
      isPending: false,
    } as never);
    vi.mocked(useSilverCompanyDetail).mockReturnValue({
      data: {
        success: true,
        data: {
          id: "s9",
          denumire: "Firma X",
          cui: "RO9",
          cifraAfaceri: 1234.56,
          profitNet: "bad",
          numarAngajati: 3,
          email: "a@b.c",
          telefon: "07",
          website: "https://x.ro",
          adresa: "Str 1",
          enrichmentStatus: "complete",
          promotionStatus: "ready",
          totalQualityScore: 88,
          metadata: { k: 1 },
          enrichmentLogs: [
            {
              id: "l1",
              source: "anaf",
              operation: "pull",
              createdAt: "2024-06-01T10:00:00.000Z",
              fieldsUpdated: ["cui", "tel"],
              durationMs: 42,
            },
          ],
        },
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue({}),
    } as never);
    vi.mocked(useSilverEnrichmentLog).mockReturnValue(qList([]) as never);
    const user = userEvent.setup();
    wrap(
      <MemoryRouter initialEntries={["/silver/companies/s9"]}>
        <Routes>
          <Route path="/silver/companies/:id" element={<SilverCompanyDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole("tab", { name: /^Financial$/i }));
    expect(screen.getByText(/Cifra Afaceri/i)).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /^Contact$/i }));
    await user.click(screen.getByRole("tab", { name: /^Enrichment$/i }));
    await user.click(screen.getByRole("tab", { name: /Enrichment Logs/i }));
    expect(screen.getByText(/anaf/)).toBeInTheDocument();
    expect(screen.getByText(/Durată: 42ms/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Re-Enrich/i }));
    await user.click(screen.getByRole("button", { name: /Promote to Gold/i }));
    expect(enrich).toHaveBeenCalledWith("s9");
    expect(promote).toHaveBeenCalledWith("s9");
  });
});
