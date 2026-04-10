import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout.js";
import { Sidebar } from "@/components/layout/Sidebar.js";
import { AuthProvider } from "@/providers/auth-provider.js";
import { server } from "@/test-utils/msw/server.js";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@/hooks/use-dashboard-kpi-stream.js", () => ({
  useDashboardKpiStream: () => ({ sseConnected: false }),
}));

function seedAuth() {
  localStorage.setItem("cerniq_token", "t.t.t");
  localStorage.setItem(
    "cerniq_user",
    JSON.stringify({
      id: "u1",
      email: "a@b.c",
      name: "User Test",
      tenantId: "ten",
      role: "admin",
    }),
  );
}

describe("AppLayout și Sidebar", () => {
  beforeEach(() => {
    localStorage.clear();
    server.use(
      http.get("*/api/v1/outreach/reviews/stats", () =>
        HttpResponse.json({
          success: true,
          data: {
            avgResolutionTimeMs: 0,
            slaBreachRate: 0,
            reviewsPerDay: 0,
            byPriority: {},
            byStatus: { PENDING: 2 },
          },
        }),
      ),
      http.get("*/api/v1/system/processes", () =>
        HttpResponse.json({
          success: true,
          data: { processes: [], activeCount: 1, queuesReachable: true },
        }),
      ),
    );
  });

  it("AppLayout randează skip link, header, outlet", async () => {
    seedAuth();
    const user = userEvent.setup();
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AuthProvider>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="dashboard" element={<div>Continut pagina</div>} />
              </Route>
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Sari la conținut")).toBeInTheDocument();
    expect(await screen.findByText("Continut pagina")).toBeInTheDocument();
    await user.click(screen.getByText("Sari la conținut"));
  });

  it("Sidebar navigare, colaps, logout", async () => {
    seedAuth();
    const user = userEvent.setup();
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AuthProvider>
            <Sidebar />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    await user.click(screen.getByRole("button", { name: "Expand sidebar" }));
    await user.click(screen.getByRole("button", { name: "Logout" }));
  });
});
