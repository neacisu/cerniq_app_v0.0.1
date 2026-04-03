/**
 * Teste țintă pentru ProductCatalog: contract API hybrid search + randare discount.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const postMock = vi.fn();
const getMock = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/api.js", () => ({
  api: {
    get: (path: string) => getMock(path),
    post: (path: string, body?: unknown) => postMock(path, body),
  },
  ApiError: class ApiError extends Error {
    readonly status: number;
    constructor(message: string, status = 500) {
      super(message);
      this.status = status;
    }
  },
}));

import { ProductCatalog } from "@/pages/etapa3/ProductCatalog.js";

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function defaultGet(url: string): Promise<unknown> {
  if (url.startsWith("/api/v1/products/categories")) {
    return Promise.resolve({
      success: true,
      data: [{ id: "cat1", name: "Categorie test" }],
    });
  }
  if (url.startsWith("/api/v1/products/stats")) {
    return Promise.resolve({
      success: true,
      data: {
        products: { total: 1, active: 1, withEmbeddings: 0 },
        inventory: { totalSkus: 1, totalStock: 5, reserved: 0 },
      },
    });
  }
  if (url.startsWith("/api/v1/products?")) {
    return Promise.resolve({
      success: true,
      data: [
        {
          id: "p1",
          sku: "SKU-1",
          name: "Produs test",
          unitPrice: 10,
          currency: "RON",
          stockAvailable: 5,
          isActive: true,
          categoryName: "Categorie test",
          chunkCount: 0,
          hasEmbedding: false,
          metadata: { maxDiscount: 12 },
        },
      ],
      meta: { page: 1, limit: 50, total: 1, pages: 1 },
    });
  }
  return Promise.reject(new Error(`GET neașteptat: ${url}`));
}

describe("ProductCatalog", () => {
  beforeEach(() => {
    postMock.mockReset();
    getMock.mockReset();
    getMock.mockImplementation(defaultGet);
    postMock.mockResolvedValue({});
  });

  it("POST hybrid: fără categoryId când e selectat «Toate categoriile»", async () => {
    const client = createClient();
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ProductCatalog />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Căutare în catalog/i)).toBeInTheDocument();
    });
    await user.type(screen.getByPlaceholderText(/Căutare în catalog/i), "termen");
    await user.click(screen.getByRole("button", { name: /Trimite hybrid/i }));
    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0]?.[0]).toBe("/api/v1/products/search");
    expect(postMock.mock.calls[0]?.[1]).toEqual({ query: "termen", limit: 20 });
  });

  it("POST hybrid: include categoryId când e aleasă o categorie concretă", async () => {
    const client = createClient();
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ProductCatalog />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Categorie test/i })).toBeInTheDocument();
    });
    const categorySelect = screen.getAllByRole("combobox")[0];
    await user.selectOptions(categorySelect, "cat1");
    await user.type(screen.getByPlaceholderText(/Căutare în catalog/i), "x");
    await user.click(screen.getByRole("button", { name: /Trimite hybrid/i }));
    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0]?.[1]).toEqual({ query: "x", limit: 20, categoryId: "cat1" });
  });

  it("afișează discount maxim din metadata când e număr finit", async () => {
    const client = createClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ProductCatalog />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText("Produs test")).toBeInTheDocument();
    });
    const row = screen.getByText("Produs test").closest("tr");
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText(/max -12%/)).toBeInTheDocument();
  });
});
