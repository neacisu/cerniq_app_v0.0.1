/**
 * Import Contacte: contract API real (paths) prin MSW — listă goală, încărcare, eroare.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

describe("Import (pagină etapa1)", () => {
  beforeEach(() => {
    server.resetHandlers();
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
});
