/**
 * Grupul de rute protejate: layout + potrivire câteva path-uri (mock pagini pentru viteză).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { http, HttpResponse } from "msw";
import { ProtectedLayoutRouteGroup } from "@/routing/protected-layout-routes.js";
import { server } from "@/test-utils/msw/server.js";

vi.mock("@/providers/auth-provider.js", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/layout/AppLayout.js", () => ({
  AppLayout: () => <Outlet />,
}));

vi.mock("@/pages/dashboard/index.js", () => ({
  Dashboard: () => <div data-testid="page-dashboard">Dashboard</div>,
}));

vi.mock("@/pages/etapa2/leads.js", () => ({
  Leads: () => <div data-testid="page-leads">Leads</div>,
}));

function wrapWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("ProtectedLayoutRouteGroup", () => {
  beforeEach(() => {
    server.use(
      http.get("*/api/v1/imports", ({ request }) => {
        const u = new URL(request.url);
        if (u.searchParams.get("page") === "0" || u.pathname.endsWith("/imports")) {
          return HttpResponse.json({
            success: true,
            data: [],
            meta: { total: 0, limit: 30, offset: 0 },
          });
        }
        return HttpResponse.json({ success: true, data: [], meta: { total: 0 } });
      }),
    );
  });

  it("încarcă ruta lazy /brain (CognitiveBrainPage)", async () => {
    wrapWithQuery(
      <MemoryRouter initialEntries={["/brain"]}>
        <Routes>{ProtectedLayoutRouteGroup()}</Routes>
      </MemoryRouter>,
    );
    expect(
      await screen.findByTestId("cognitive-brain-page", {}, { timeout: 15_000 }),
    ).toBeInTheDocument();
  });

  it("afișează Dashboard la /dashboard", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>{ProtectedLayoutRouteGroup()}</Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("page-dashboard")).toBeInTheDocument();
  });

  it("afișează Leads la /leads (alias scurt)", () => {
    render(
      <MemoryRouter initialEntries={["/leads"]}>
        <Routes>{ProtectedLayoutRouteGroup()}</Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("page-leads")).toBeInTheDocument();
  });
});
