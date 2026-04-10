/**
 * Drawer-e companie / contact — hook-uri mock-uite pentru acoperire UI.
 */
import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoldCompanyDrawer } from "@/components/drawers/GoldCompanyDrawer.js";
import { BronzeContactDrawer } from "@/components/drawers/BronzeContactDrawer.js";
import { SilverCompanyDrawer } from "@/components/drawers/SilverCompanyDrawer.js";

const goldPayload = {
  success: true as const,
  data: {
    denumire: "Firma G",
    cui: "RO1",
    currentState: "ENGAGED",
    leadScore: 8,
    assignedTo: "u1",
    doNotContact: false,
    email: "a@b.c",
    metadata: { k: 1 },
    journey: [
      {
        id: "j1",
        fromState: "A",
        toState: "B",
        createdAt: "2026-01-01T12:00:00.000Z",
        triggeredBy: "sys",
      },
    ],
  },
};

vi.mock("@/hooks/use-etapa1.js", () => ({
  useGoldCompanyDetail: (id?: string) =>
    id
      ? { data: goldPayload, isPending: false, isError: false, error: null }
      : { data: undefined, isPending: false, isError: false, error: null },
  useBronzeContactDetail: (id?: string) =>
    id
      ? {
          data: {
            success: true,
            data: {
              id: "b1",
              extractedName: "Nume",
              sourceType: "csv_import",
              processingStatus: "done",
              identityStatus: "resolved",
              isDuplicate: false,
              doNotProcess: false,
            },
          },
          isPending: false,
          isError: false,
          error: null,
        }
      : { data: undefined, isPending: false, isError: false, error: null },
  useSilverCompanyDetail: (id?: string) =>
    id
      ? {
          data: {
            success: true,
            data: {
              denumire: "S Co",
              cui: "2",
              enrichmentStatus: "complete",
              qualityScore: 90,
              judet: "B",
            },
          },
          isPending: false,
          isError: false,
          error: null,
        }
      : { data: undefined, isPending: false, isError: false, error: null },
}));

function withQc(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{node}</QueryClientProvider>;
}

describe("GoldCompanyDrawer", () => {
  it("afișează date și tab Journey", async () => {
    const user = userEvent.setup();
    render(withQc(<GoldCompanyDrawer open id="g1" onClose={vi.fn()} />));
    expect(screen.getByRole("heading", { name: "Firma G" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /Journey/i }));
    expect(screen.getByText(/A → B/)).toBeInTheDocument();
  });
});

describe("BronzeContactDrawer", () => {
  it("afișează câmpuri extrase", () => {
    render(withQc(<BronzeContactDrawer open id="b1" onClose={vi.fn()} />));
    expect(screen.getByRole("heading", { name: "Nume" })).toBeInTheDocument();
  });
});

describe("SilverCompanyDrawer", () => {
  it("afișează titlu și tab General", async () => {
    const user = userEvent.setup();
    render(withQc(<SilverCompanyDrawer open id="s1" onClose={vi.fn()} />));
    expect(screen.getByRole("heading", { name: "S Co" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /Financiar/i }));
  });
});
