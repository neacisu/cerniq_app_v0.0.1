/**
 * Registru de căi GET folosite în `pages/etapa3` — verificare prefix și domeniu (fără date mock în UI).
 * La schimbarea unei rute în pagină, actualizați acest tabel (grep: api.get în etapa3).
 */
import { describe, it, expect } from "vitest";

const E3_API_GET_PREFIXES = [
  "/api/v1/negotiation/stats",
  "/api/v1/negotiation?page=1&limit=100",
  "/api/v1/negotiation/guardrails?limit=100",
  "/api/v1/products/categories",
  "/api/v1/products/stats",
  "/api/v1/fiscal/oblio/documents?page=1&limit=100",
  "/api/v1/fiscal/einvoice/submissions?page=1&limit=200",
] as const;

describe("E3 pages — căi API documentate (products | negotiation | fiscal)", () => {
  it("fiecare cale începe cu /api/v1/ și un prefix permis", () => {
    // După segmentul de domeniu urmează `/`, `?` (ex. /negotiation?page=) sau sfârșit.
    const allowed = /^\/api\/v1\/(negotiation|products|fiscal)(\/|\?|$)/;
    for (const path of E3_API_GET_PREFIXES) {
      expect(path.startsWith("/api/v1/")).toBe(true);
      expect(path).toMatch(allowed);
    }
  });

  it("șabloane dinamice negociere/mesaje (documentare)", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    expect(`/api/v1/negotiation/${id}`).toMatch(/^\/api\/v1\/negotiation\/[a-f0-9-]+$/i);
    expect(`/api/v1/negotiation/${id}/messages?limit=80`).toContain("/messages");
    expect(`/api/v1/negotiation/${id}/guardrails?limit=50`).toContain("/guardrails");
    expect(`/api/v1/products?limit=25&offset=0`).toMatch(/^\/api\/v1\/products\?/);
  });
});
