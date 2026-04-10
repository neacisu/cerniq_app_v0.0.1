/**
 * Hub-uri E3/E4/E5 (8+7+6 pagini) — RTL cu MSW global + token JWT.
 * Aserțiuni pe valori aliniate la `test-utils/msw/handlers.ts` (nu MOCK_* runtime în pagini).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("@/providers/auth-provider.js", () => ({
  useAuth: () => ({
    token: "jwt-msw-e345",
    user: { id: "u1", email: "a@b.c", role: "admin", tenantId: "tenant-1" },
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));

import { AiDashboard } from "@/pages/etapa3/ai-dashboard.js";
import { Negotiations } from "@/pages/etapa3/negotiations.js";
import { Offers } from "@/pages/etapa3/offers.js";
import { Invoices } from "@/pages/etapa3/invoices.js";
import { Guardrails } from "@/pages/etapa3/guardrails.js";
import { Payments } from "@/pages/etapa4/payments.js";
import { Credit } from "@/pages/etapa4/credit.js";
import { Returns } from "@/pages/etapa4/returns.js";
import { Nurturing } from "@/pages/etapa5/nurturing.js";
import { Referrals } from "@/pages/etapa5/referrals.js";
import { Churn } from "@/pages/etapa5/churn.js";
import { GeoMap } from "@/pages/etapa5/geo-map.js";
import { NegotiationConversation } from "@/pages/etapa3/NegotiationConversation.js";
import { ProductCatalog } from "@/pages/etapa3/ProductCatalog.js";
import { FiscalDocuments } from "@/pages/etapa3/FiscalDocuments.js";
import { Logistics } from "@/pages/etapa4/logistics.js";
import { OrderDashboard } from "@/pages/etapa4/OrderDashboard.js";
import { CreditProfile } from "@/pages/etapa4/CreditProfile.js";
import { ContractBuilder } from "@/pages/etapa4/ContractBuilder.js";
import { NurturingDashboard } from "@/pages/etapa5/NurturingDashboard.js";
import { ReferralManager } from "@/pages/etapa5/ReferralManager.js";

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  globalThis.localStorage.setItem("cerniq_token", "jwt-msw-e345");
});

describe("E3 hub pages (MSW)", () => {
  it("AiDashboard: FSM DISCOVERY din GET /negotiation/stats (byState MSW)", async () => {
    wrap(<AiDashboard />);
    expect(
      await screen.findByRole("heading", { name: /AI Sales Agent Dashboard/i }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText("DISCOVERY").length).toBeGreaterThan(0);
    });
  });

  it("Negotiations: companie SC AgroSud SRL din lista MSW", async () => {
    wrap(<Negotiations />);
    expect(await screen.findByText("SC AgroSud SRL")).toBeInTheDocument();
  });

  it("Offers: listă negocieri din același contract MSW", async () => {
    wrap(<Offers />);
    expect(await screen.findByRole("heading", { name: /^Oferte$/ })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("SC AgroSud SRL")).toBeInTheDocument();
    });
  });

  it("Invoices: serie/număr CERN/124 din documente Oblio MSW (INVOICE, coloana Nr)", async () => {
    wrap(<Invoices />);
    expect(await screen.findByRole("heading", { name: /e-Factura SPV ANAF/i })).toBeInTheDocument();
    expect(await screen.findByText("CERN/124")).toBeInTheDocument();
  });

  it("Guardrails: rând audit din violare discount MSW (cod M73 + input din response)", async () => {
    wrap(<Guardrails />);
    expect(
      await screen.findByRole("heading", { name: /Anti-Hallucination Guardrails/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Discount Guard")).toBeInTheDocument();
    expect(screen.getByText(/Fragment răspuns AI/i)).toBeInTheDocument();
  });

  it("NegotiationConversation: SC AgroSud SRL din GET /negotiation MSW", async () => {
    wrap(<NegotiationConversation />);
    expect(
      await screen.findByRole("heading", { name: /AI Sales — Conversation/i }),
    ).toBeInTheDocument();
    expect((await screen.findAllByText("SC AgroSud SRL")).length).toBeGreaterThan(0);
  });

  it("ProductCatalog: Semințe Grâu PREMIUM din GET /products MSW", async () => {
    wrap(<ProductCatalog />);
    expect(await screen.findByRole("heading", { name: /Catalog Produse/i })).toBeInTheDocument();
    expect(await screen.findByText("Semințe Grâu PREMIUM")).toBeInTheDocument();
  });

  it("FiscalDocuments: CERN/123 din oblio/documents MSW (PROFORMA)", async () => {
    wrap(<FiscalDocuments />);
    expect(await screen.findByRole("heading", { name: /^Documente Fiscale$/ })).toBeInTheDocument();
    expect(await screen.findByText("CERN/123")).toBeInTheDocument();
  });
});

describe("E4 hub pages (MSW)", () => {
  it("Payments: client SC Plăți MSW SRL din orders/payments", async () => {
    wrap(<Payments />);
    expect(
      await screen.findByRole("heading", { name: /Payments — Reconciliere/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText("SC Plăți MSW SRL")).toBeInTheDocument();
  });

  it("Credit: profil SC Agritech Solutions SRL din credit/profiles", async () => {
    wrap(<Credit />);
    expect(
      await screen.findByRole("heading", { name: /Credit Scoring — Overview/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText("SC Agritech Solutions SRL")).toBeInTheDocument();
  });

  it("Returns: comenzi din MSW orders (CMD-2024-0892)", async () => {
    wrap(<Returns />);
    expect(await screen.findByRole("heading", { name: /Returns RMA/i })).toBeInTheDocument();
    expect(await screen.findByText("CMD-2024-0892")).toBeInTheDocument();
  });

  it("Logistics: AWB SDY-987654321 din shipments MSW", async () => {
    wrap(<Logistics />);
    expect(await screen.findByRole("heading", { name: /Logistics AWB/i })).toBeInTheDocument();
    expect(await screen.findByText("SDY-987654321")).toBeInTheDocument();
  });

  it("OrderDashboard: CMD-2024-0892 din orders MSW", async () => {
    wrap(<OrderDashboard />);
    expect(await screen.findByRole("heading", { name: /Order Dashboard/i })).toBeInTheDocument();
    expect(await screen.findByText("CMD-2024-0892")).toBeInTheDocument();
  });

  it("CreditProfile: SC Agritech Solutions SRL din credit/profiles MSW", async () => {
    wrap(<CreditProfile />);
    expect(await screen.findByRole("heading", { name: /Credit Profiles/i })).toBeInTheDocument();
    expect((await screen.findAllByText("SC Agritech Solutions SRL")).length).toBeGreaterThan(0);
  });

  it("ContractBuilder: SC Agri Contract SRL din contracts MSW", async () => {
    wrap(<ContractBuilder />);
    expect(await screen.findByRole("heading", { name: /Contract Builder/i })).toBeInTheDocument();
    expect(await screen.findByText("SC Agri Contract SRL")).toBeInTheDocument();
  });
});

describe("E5 hub pages (MSW)", () => {
  it("Nurturing: SC Demo Farm SRL din nurturing/states", async () => {
    wrap(<Nurturing />);
    expect(
      await screen.findByRole("heading", { name: /Retention — Monitorizare Clienți/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText("SC Demo Farm SRL")).toBeInTheDocument();
  });

  it("Referrals KOL: SC KOL Alpha SRL din graph/kol-profiles", async () => {
    wrap(<Referrals />);
    expect(await screen.findByRole("heading", { name: /Referrals KOL/i })).toBeInTheDocument();
    expect(await screen.findByText("SC KOL Alpha SRL")).toBeInTheDocument();
  });

  it("Churn: Cooperativa Test din churn/factors", async () => {
    wrap(<Churn />);
    expect(await screen.findByRole("heading", { name: /Churn Risk/i })).toBeInTheDocument();
    expect(await screen.findByText("Cooperativa Test")).toBeInTheDocument();
  });

  it("GeoMap: bulă Timiș (title) din graph/geo-summary MSW", async () => {
    wrap(<GeoMap />);
    expect(await screen.findByRole("heading", { name: /Geographic Map/i })).toBeInTheDocument();
    expect(await screen.findByTitle(/Timiș:\s*\d+\s+companii/i)).toBeInTheDocument();
  });

  it("NurturingDashboard: sumă lifecycle 65 din meta.total per stare (handlers MOCK_TOTALS)", async () => {
    wrap(<NurturingDashboard />);
    expect(
      await screen.findByRole("heading", { name: /Nurturing Dashboard/i }),
    ).toBeInTheDocument();
    await waitFor(() => {
      const label = screen.getByText("Clienți (lifecycle DB)");
      expect(label.previousElementSibling?.textContent?.trim()).toBe("65");
    });
  });

  it("ReferralManager: SC Farm Tecuci SA din GET /referrals MSW", async () => {
    wrap(<ReferralManager />);
    expect(await screen.findByRole("heading", { name: /Referral Manager/i })).toBeInTheDocument();
    expect((await screen.findAllByText("SC Farm Tecuci SA")).length).toBeGreaterThan(0);
  });
});

describe("App.tsx — înregistrare rute hub E3/E4/E5 (21 căi)", () => {
  let appSrc: string;
  beforeEach(() => {
    appSrc = readFileSync(
      resolve(__dirname, "../../src/routing/protected-layout-routes.tsx"),
      "utf-8",
    );
  });

  it.each([
    ["/ai-dashboard"],
    ["/negotiations"],
    ["/offers"],
    ["/invoices"],
    ["/guardrails"],
    ["/negotiations/conversation"],
    ["/products"],
    ["/fiscal/documents"],
    ["/payments"],
    ["/credit"],
    ["/logistics"],
    ["/returns"],
    ["/orders/board"],
    ["/credit/profile"],
    ["/contracts/builder"],
    ["/nurturing"],
    ["/referrals"],
    ["/churn"],
    ["/geo-map"],
    ["/nurturing/dashboard"],
    ["/referral/manager"],
  ])("Route path=%s", (path) => {
    expect(appSrc).toContain(`path="${path}"`);
  });
});
