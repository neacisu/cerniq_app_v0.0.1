/**
 * Workers: acțiuni HTTP reale (paths), feedback din răspuns; mock api + auth admin.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import React from "react";

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock("@/providers/auth-provider.js", () => ({
  useAuth: () => ({ user: { role: "admin", id: "u1" } }),
}));

vi.mock("@/lib/api.js", () => ({
  api: {
    get: (...a: unknown[]) => getMock(...a),
    post: (...a: unknown[]) => postMock(...a),
  },
  ApiError: class ApiError extends Error {
    readonly status: number;
    readonly data?: unknown;
    constructor(message: string, status = 500, data?: unknown) {
      super(message);
      this.status = status;
      this.data = data;
    }
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

import { Workers } from "@/pages/system/workers.js";
import { toast } from "sonner";

const QUEUE = "ingest:csv";

function livePayload() {
  return {
    success: true,
    data: {
      timestamp: Date.now(),
      queues: [
        {
          name: QUEUE,
          waiting: 1,
          active: 0,
          completed: 0,
          failed: 1,
          delayed: 0,
          paused: false,
        },
      ],
      system: { cpu: 0.1 },
    },
  };
}

function catalogPayload() {
  return {
    success: true,
    data: {
      metrics: [
        { name: "cerniq_http_requests_total", type: "counter", help: "Total HTTP requests" },
      ],
      scrapeNote: "GET /metrics allowlist",
    },
  };
}

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Workers page", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    vi.mocked(toast.success).mockReset();
    getMock.mockImplementation((path: string) => {
      if (path === "/api/admin/live") return Promise.resolve(livePayload());
      if (path === "/api/admin/prometheus/api-plugin-catalog")
        return Promise.resolve(catalogPayload());
      if (path === `/api/admin/queues/${encodeURIComponent(QUEUE)}`) {
        return Promise.resolve({
          success: true,
          data: { name: QUEUE, waiting: 1, throughput: 2, latency: 4 },
        });
      }
      return Promise.reject(new Error(`unexpected GET ${path}`));
    });
    postMock.mockResolvedValue({
      success: true,
      data: { name: QUEUE, paused: true, waiting: 0, active: 0, completed: 0, failed: 0 },
    });
  });

  it("încarcă live și afișează KPI din răspuns", async () => {
    wrap(<Workers />);
    await waitFor(() => expect(screen.getByText(QUEUE)).toBeInTheDocument());
    expect(getMock).toHaveBeenCalledWith("/api/admin/live");
    expect(getMock).toHaveBeenCalledWith("/api/admin/prometheus/api-plugin-catalog");
  });

  it("afișează catalogul metricilor API (nume din răspuns)", async () => {
    wrap(<Workers />);
    await waitFor(() => expect(screen.getByText("cerniq_http_requests_total")).toBeInTheDocument());
  });

  it("POST pauză la path corect și toast din corp răspuns", async () => {
    const user = userEvent.setup();
    wrap(<Workers />);
    await waitFor(() => expect(screen.getByRole("button", { name: /Pauză/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Pauză/i }));
    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0]?.[0]).toBe(
      `/api/admin/queues/${encodeURIComponent(QUEUE)}/pause`,
    );
    expect(vi.mocked(toast.success)).toHaveBeenCalled();
  });

  it("în timpul încărcării live afișează mesajul GET /api/admin/live", async () => {
    getMock.mockImplementation((path: string) => {
      if (path === "/api/admin/live") return new Promise(() => undefined);
      if (path === "/api/admin/prometheus/api-plugin-catalog")
        return Promise.resolve(catalogPayload());
      return Promise.reject(new Error("unexpected"));
    });
    wrap(<Workers />);
    expect(
      await screen.findByText(/Se încarcă datele din GET \/api\/admin\/live/i),
    ).toBeInTheDocument();
  });

  it("live fără cozi afișează mesaj gol (nu rânduri inventate)", async () => {
    getMock.mockImplementation((path: string) => {
      if (path === "/api/admin/live") {
        return Promise.resolve({
          success: true,
          data: { timestamp: 1, queues: [], system: null },
        });
      }
      if (path === "/api/admin/prometheus/api-plugin-catalog")
        return Promise.resolve(catalogPayload());
      return Promise.reject(new Error("unexpected"));
    });
    wrap(<Workers />);
    await waitFor(() =>
      expect(
        screen.getByText(/Nicio coadă returnată\. Verificați Monitoring API/i),
      ).toBeInTheDocument(),
    );
  });

  it("la eșec live afișează mesajul din ApiError", async () => {
    const { ApiError } = await import("@/lib/api.js");
    getMock.mockImplementation((path: string) => {
      if (path === "/api/admin/live") {
        return Promise.reject(new ApiError("live interzis", 403));
      }
      if (path === "/api/admin/prometheus/api-plugin-catalog")
        return Promise.resolve(catalogPayload());
      return Promise.reject(new Error("unexpected"));
    });
    wrap(<Workers />);
    await waitFor(() => expect(screen.getByText(/live interzis/i)).toBeInTheDocument());
  });

  it("la eșec catalog Prometheus afișează alertă în secțiunea metricilor", async () => {
    getMock.mockImplementation((path: string) => {
      if (path === "/api/admin/live") return Promise.resolve(livePayload());
      if (path === "/api/admin/prometheus/api-plugin-catalog") {
        return Promise.reject(new Error("catalog down"));
      }
      if (path === `/api/admin/queues/${encodeURIComponent(QUEUE)}`) {
        return Promise.resolve({
          success: true,
          data: { name: QUEUE, waiting: 1, throughput: 2, latency: 4 },
        });
      }
      return Promise.reject(new Error(`unexpected GET ${path}`));
    });
    wrap(<Workers />);
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/Eroare la încărcarea catalogului/i),
    );
  });

  it("retry-failed dezactivat când failed=0", async () => {
    getMock.mockImplementation((path: string) => {
      if (path === "/api/admin/live") {
        return Promise.resolve({
          success: true,
          data: {
            timestamp: 1,
            queues: [
              { name: QUEUE, waiting: 0, active: 0, completed: 0, failed: 0, paused: false },
            ],
            system: null,
          },
        });
      }
      if (path === "/api/admin/prometheus/api-plugin-catalog")
        return Promise.resolve(catalogPayload());
      return Promise.reject(new Error("unexpected"));
    });
    wrap(<Workers />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Reîncearcă eșuate/i })).toBeDisabled(),
    );
  });
});
