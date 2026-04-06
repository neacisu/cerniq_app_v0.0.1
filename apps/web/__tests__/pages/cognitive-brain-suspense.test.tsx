/**
 * Suspense / lazy (parity cu ruta `/brain` din App.tsx) + eroare încărcare chunk → ErrorBoundary.
 * Batch/query și BrainBatchRedirect: suite principală în cognitive-routing.test.tsx.
 */
import React, { lazy, Suspense } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary.js";

/** Păstrat în sync cu fallback-ul din `App.tsx` pentru `path="/brain"`. */
const BRAIN_SUSPENSE_FALLBACK = <div className="p-6 text-muted-foreground">Se încarcă…</div>;

function LoadedBrainStub() {
  return <div data-testid="cognitive-brain-page">brain-loaded</div>;
}

function makeDelayedBrainPage(delayMs: number) {
  return lazy(
    () =>
      new Promise<{ default: React.ComponentType }>((resolve) => {
        setTimeout(() => resolve({ default: LoadedBrainStub }), delayMs);
      }),
  );
}

describe("Cognitive brain — Suspense fallback (parity App.tsx /brain)", () => {
  it("afișează „Se încarcă…” până la rezolvarea lazy", async () => {
    const Page = makeDelayedBrainPage(80);
    render(
      <MemoryRouter initialEntries={["/brain"]}>
        <Routes>
          <Route
            path="/brain"
            element={
              <Suspense fallback={BRAIN_SUSPENSE_FALLBACK}>
                <Page />
              </Suspense>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Se încarcă…")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("cognitive-brain-page")).toHaveTextContent("brain-loaded");
    });
    expect(screen.queryByText("Se încarcă…")).not.toBeInTheDocument();
  });
});

describe("Cognitive brain — eroare încărcare lazy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ErrorBoundary prinde respingerea promisiunii lazy", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Broken = lazy(() => Promise.reject(new Error("chunk-load-fail")));
    render(
      <MemoryRouter initialEntries={["/brain"]}>
        <ErrorBoundary>
          <Routes>
            <Route
              path="/brain"
              element={
                <Suspense fallback={BRAIN_SUSPENSE_FALLBACK}>
                  <Broken />
                </Suspense>
              }
            />
          </Routes>
        </ErrorBoundary>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Something went wrong/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/chunk-load-fail/)).toBeInTheDocument();
  });
});
