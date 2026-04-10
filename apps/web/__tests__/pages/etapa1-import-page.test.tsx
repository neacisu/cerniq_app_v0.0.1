/**
 * Import Contacte: contract API real (paths) prin MSW — listă goală, încărcare, eroare.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import React from "react";
import { server } from "@/test-utils/msw/server.js";

vi.mock("@/providers/auth-provider.js", () => ({
  useAuth: () => ({
    token: "jwt-test",
    user: { id: "u1", email: "a@b.c", role: "admin", tenantId: "t1" },
  }),
}));

import { Import } from "@/pages/etapa1/import.js";

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const controlJson = {
  success: true,
  data: {
    globalPaused: false,
    pausedAt: null,
    pausedBy: null,
    resumeRequestedAt: null,
    version: 1,
  },
};

const pipelineBody = {
  success: true,
  data: {
    batchId: "imp-rich",
    batchStatus: "processing",
    totalRows: 10,
    successRows: 8,
    reprocessJob: {
      state: "stale",
      isStale: true,
      isBacklogged: false,
      jobId: "job-12345678901234",
      attemptsMade: 2,
      maxAttempts: 3,
      failedReason: "worker timeout",
      stacktrace: "at x",
      processedOn: null,
      finishedOn: null,
      lastProgressAt: new Date().toISOString(),
      dbStatus: "running",
      phase: "identity_resolution",
      processed: 6,
      total: 10,
      counterDrift: true,
      resolved: 4,
      duplicateSource: 1,
      identityConflict: 0,
      insufficientIdentifiers: 0,
      failedContacts: 2,
      promotionQueued: 1,
      startedAt: new Date(Date.now() - 60_000).toISOString(),
      completedAt: null,
      failedAt: null,
      sessionStartedAt: new Date(Date.now() - 30_000).toISOString(),
      mode: "errors_only",
    },
    promotionQueue: { waiting: 1, active: 0, completed: 2, failed: 0, delayed: 0 },
    promotionMetrics: {
      scopeTotal: 10,
      processed: 5,
      completed: 4,
      failed: 1,
      skipped: 0,
      running: 1,
      paused: 0,
      silverContactsInitial: 0,
      silverContactsPromotedDuringSession: 3,
      silverContactsCurrent: 8,
      externalDelta: 2,
    },
    anafProgress: {
      state: "running",
      totalCuis: 100,
      processedCuis: 40,
      totalBatches: 2,
      processedBatches: 1,
      failedBatches: 0,
      heartbeatAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      completedAt: null,
      throughput: 12.5,
    },
  },
};

const richImportRow = {
  id: "imp-rich",
  filename: "batch-pipeline.csv",
  status: "completed",
  processedRows: 10,
  totalRows: 10,
  createdAt: "2024-01-01T00:00:00.000Z",
  metadata: {
    anafEnrichmentStatus: "running",
    identityReprocessStatus: "running",
    identityReprocessQueuedAt: "2024-01-01T00:00:00.000Z",
    identityReprocessStartedAt: "2024-01-01T00:00:01.000Z",
    identityReprocessLastProgressAt: new Date().toISOString(),
    identityReprocessProcessedRows: 6,
    identityReprocessRunTotalRows: 10,
    identityReprocessFailedContactCount: 2,
    identityReprocessSessionProcessedBaseRows: 1,
    lastProgressAt: new Date().toISOString(),
  },
  control: { batchPaused: false, hidden: false },
  identitySummary: { resolvedCompanies: 2, duplicateSourceRows: 0, identityConflictRows: 1 },
  latestAttemptSummary: { successRows: 8, duplicateRows: 1, errorRows: 1 },
  quarantineSummary: { totalRows: 2 },
};

describe("Import (pagină etapa1)", () => {
  beforeEach(() => {
    server.resetHandlers();
    globalThis.localStorage?.setItem("cerniq_token", "jwt-test");
  });

  it("cu listă goală afișează titlul și nu rămâne în spinner", async () => {
    server.use(
      http.get("*/api/v1/imports", () =>
        HttpResponse.json({
          success: true,
          data: [],
          meta: { total: 0, limit: 25, offset: 0 },
        }),
      ),
      http.get("*/api/v1/imports/control", () => HttpResponse.json(controlJson)),
    );
    wrap(<Import />);
    expect(screen.getByRole("heading", { name: /Import Contacte/i })).toBeInTheDocument();
    expect(
      await screen.findByText(/Niciun import efectuat\. Folosește template-ul/i),
    ).toBeInTheDocument();
  });

  it("în timpul încărcării listei afișează spinner", async () => {
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = () => resolve();
    });
    server.use(
      http.get("*/api/v1/imports", async () => {
        await barrier;
        return HttpResponse.json({
          success: true,
          data: [],
          meta: { total: 0, limit: 25, offset: 0 },
        });
      }),
      http.get("*/api/v1/imports/control", () => HttpResponse.json(controlJson)),
    );
    const { container } = wrap(<Import />);
    await waitFor(() => {
      expect(container.querySelector(".animate-spin")).toBeTruthy();
    });
    release();
    expect(await screen.findByText(/Trage fișiere CSV sau Excel aici/i)).toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).not.toBeInTheDocument();
  });

  it("la eroare listă afișează mesaj de eroare în pagină", async () => {
    server.use(
      http.get("*/api/v1/imports", () =>
        HttpResponse.json({ success: false, error: "imports refuzat" }, { status: 502 }),
      ),
      http.get("*/api/v1/imports/control", () => HttpResponse.json(controlJson)),
    );
    wrap(<Import />);
    await waitFor(() => {
      expect(screen.getByText(/Eroare la încărcarea datelor/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/imports refuzat/i)).toBeInTheDocument();
  });

  it("istoric bogat: pipeline, job logs, pauză globală, ANAF, repromovare, retry pe rând eșuat", async () => {
    const failedRow = {
      id: "imp-fail",
      filename: "bad.csv",
      status: "failed",
      processedRows: 0,
      totalRows: 0,
      createdAt: "2024-01-02T00:00:00.000Z",
      metadata: { lastError: "parse error line 1" },
      control: { batchPaused: false, hidden: false },
      identitySummary: {},
      latestAttemptSummary: {},
      quarantineSummary: { totalRows: 0 },
    };

    server.use(
      http.get("*/api/v1/imports", () =>
        HttpResponse.json({
          success: true,
          data: [richImportRow, failedRow],
          meta: { total: 2, limit: 25, offset: 0 },
        }),
      ),
      http.get("*/api/v1/imports/control", () =>
        HttpResponse.json({
          success: true,
          data: {
            globalPaused: true,
            pausedAt: new Date().toISOString(),
            pausedBy: "u1",
            resumeRequestedAt: null,
            version: 1,
          },
        }),
      ),
      http.get("*/api/v1/imports/:id/pipeline-status", ({ params }) => {
        if (params.id === "imp-rich") {
          return HttpResponse.json(pipelineBody);
        }
        return HttpResponse.json({
          success: true,
          data: {
            batchId: String(params.id),
            batchStatus: "failed",
            totalRows: 0,
            successRows: 0,
            reprocessJob: null,
            promotionQueue: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
          },
        });
      }),
      http.get("*/api/v1/imports/:id/job-logs", () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: "log1",
              createdAt: new Date().toISOString(),
              workerName: "ingest",
              step: "parse",
              message: "cell invalid",
              details: { row: 1 },
            },
          ],
          meta: { total: 2 },
        }),
      ),
      http.post("*/api/v1/imports/control/resume", () =>
        HttpResponse.json({
          success: true,
          data: {
            globalPaused: false,
            pausedAt: null,
            pausedBy: null,
            resumeRequestedAt: null,
            version: 2,
          },
        }),
      ),
      http.post("*/api/v1/imports/control/pause", () =>
        HttpResponse.json({
          success: true,
          data: {
            globalPaused: true,
            pausedAt: new Date().toISOString(),
            pausedBy: "u1",
            resumeRequestedAt: null,
            version: 3,
          },
        }),
      ),
      http.post("*/api/v1/imports/:id/retry", () =>
        HttpResponse.json({ success: true, data: { id: "imp-fail" } }),
      ),
      http.post("*/api/v1/imports/:id/re-promote", () =>
        HttpResponse.json({ success: true, data: { alreadyQueued: false } }),
      ),
      http.post("*/api/v1/imports/:id/anaf-enrich", () =>
        HttpResponse.json({ success: true, data: { queued: 3 } }),
      ),
      http.post("*/api/v1/imports/:id/pause", () => HttpResponse.json({ success: true, data: {} })),
      http.post("*/api/v1/imports/:id/resume", () =>
        HttpResponse.json({ success: true, data: {} }),
      ),
      http.post("*/api/v1/imports/:id/resume-promote", () =>
        HttpResponse.json({ success: true, data: {} }),
      ),
      http.post("*/api/v1/imports/:id/reprocess-errors/resume", () =>
        HttpResponse.json({ success: true, data: {} }),
      ),
    );

    const user = userEvent.setup();
    wrap(<Import />);

    expect(await screen.findByText(/batch-pipeline\.csv/i)).toBeInTheDocument();
    expect(screen.getByText(/Workeri pipeline/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resume Global/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Resume Global/i }));

    const anafButtons = await screen.findAllByRole("button", { name: /Prelucreaza ANAF/i });
    await user.click(anafButtons[0]);
    await user.click(screen.getAllByRole("button", { name: /Re-promoveaza/i })[0]);

    const detalii = screen.getAllByRole("button", { name: /^detalii$/i });
    await user.click(detalii[0]);

    const resumePipeline = screen.getAllByRole("button", { name: /^Resume$/i });
    await user.click(resumePipeline[0]);

    const badSection = screen.getByText(/bad\.csv/i).closest("div.py-4");
    expect(badSection).toBeTruthy();
    await user.click(within(badSection as HTMLElement).getByRole("button", { name: /^Resume$/i }));
  });

  it("upload CSV + structură coloane + descărcare template", async () => {
    server.use(
      http.get("*/api/v1/imports", () =>
        HttpResponse.json({
          success: true,
          data: [],
          meta: { total: 0, limit: 25, offset: 0 },
        }),
      ),
      http.get("*/api/v1/imports/control", () => HttpResponse.json(controlJson)),
      http.get("*/api/v1/imports/template/columns", () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              header: "firma",
              required: true,
              autoMapped: true,
              description: "Nume",
              example: "Ex SRL",
            },
          ],
        }),
      ),
      http.post("*/api/v1/imports", () =>
        HttpResponse.json({
          success: true,
          data: { id: "new1", filename: "up.csv" },
        }),
      ),
      http.get(
        "*/api/v1/imports/template",
        () => new HttpResponse(new Blob(["a,b"], { type: "text/csv" })),
      ),
    );

    const user = userEvent.setup();
    wrap(<Import />);
    await screen.findByText(/Niciun import efectuat/i);

    await user.click(screen.getByRole("button", { name: /Vezi structura coloanelor/i }));
    expect(await screen.findByText("firma")).toBeInTheDocument();

    const input = screen.getByLabelText(/Trage fișiere CSV sau Excel aici/i, {
      selector: "input",
    }) as HTMLInputElement;
    await user.upload(input, new File(["x"], "test.csv", { type: "text/csv" }));
    expect(await screen.findByText(/Fișier încărcat: test\.csv/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Descarcă CSV$/i }));
  });
});
