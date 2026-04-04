/**
 * Contract HTTP pentru `etapa4-api` — orders, credit, contracts, shipments.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "@/lib/api.js";
import {
  fetchOrdersList,
  fetchOrderStats,
  fetchTenantPayments,
  fetchShipmentsList,
  fetchShipmentDetail,
  fetchCreditProfiles,
  fetchCreditStats,
  fetchContractsList,
} from "@/lib/etapa4-api.js";

describe("etapa4-api — căi /api/v1/orders|credit|contracts|shipments", () => {
  beforeEach(() => {
    vi.spyOn(api, "get").mockResolvedValue({ success: true, data: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchOrdersList", async () => {
    await fetchOrdersList({ page: 1, limit: 20 });
    expect(api.get).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/v1\/orders(\?|$)/));
  });

  it("fetchOrderStats", async () => {
    await fetchOrderStats();
    expect(api.get).toHaveBeenCalledWith("/api/v1/orders/stats");
  });

  it("fetchTenantPayments", async () => {
    await fetchTenantPayments({ page: 1, limit: 50 });
    expect(api.get).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/v1\/orders\/payments\?/));
  });

  it("fetchShipmentsList", async () => {
    await fetchShipmentsList({ page: 1, limit: 25 });
    expect(api.get).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/v1\/shipments\?/));
  });

  it("fetchShipmentDetail", async () => {
    await fetchShipmentDetail("ship-1");
    expect(api.get).toHaveBeenCalledWith("/api/v1/shipments/ship-1");
  });

  it("fetchCreditProfiles", async () => {
    await fetchCreditProfiles({ page: 1, limit: 20 });
    expect(api.get).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/v1\/credit\/profiles\?/));
  });

  it("fetchCreditStats", async () => {
    await fetchCreditStats();
    expect(api.get).toHaveBeenCalledWith("/api/v1/credit/stats");
  });

  it("fetchContractsList", async () => {
    await fetchContractsList({ page: 1, limit: 20 });
    expect(api.get).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/v1\/contracts\?/));
  });
});
