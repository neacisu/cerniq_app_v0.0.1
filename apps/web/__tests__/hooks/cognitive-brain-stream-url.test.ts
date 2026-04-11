/**
 * Contract URL SSE: token în query (EventSource), encoding corect — aliniat la API `?token=`.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/api-url.js", () => ({
  getApiBase: () => "https://api.example.com",
}));

const getStoredToken = vi.fn<() => string | null>();

vi.mock("@/lib/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api.js")>();
  return {
    ...actual,
    getStoredToken: () => getStoredToken(),
  };
});

const getSessionCorrelationId = vi.fn<() => string>();

vi.mock("@/lib/report-client-error.js", () => ({
  getSessionCorrelationId: () => getSessionCorrelationId(),
}));

import { buildBrainStreamUrl } from "@/hooks/use-cognitive-brain.js";

describe("buildBrainStreamUrl", () => {
  beforeEach(() => {
    getStoredToken.mockReset();
    getSessionCorrelationId.mockReset();
    getSessionCorrelationId.mockReturnValue("");
  });

  it("fără token → URL fără query", () => {
    getStoredToken.mockReturnValue(null);
    expect(buildBrainStreamUrl()).toBe("https://api.example.com/api/v1/brain/events/stream");
  });

  it("cu token → ?token= cu encodeURIComponent (caractere speciale)", () => {
    getStoredToken.mockReturnValue("a+b/c");
    expect(buildBrainStreamUrl()).toBe(
      "https://api.example.com/api/v1/brain/events/stream?token=a%2Bb%2Fc",
    );
  });

  it("cu correlationId sesiune → include correlationId în query", () => {
    getStoredToken.mockReturnValue(null);
    getSessionCorrelationId.mockReturnValue("sess-abc");
    expect(buildBrainStreamUrl()).toBe(
      "https://api.example.com/api/v1/brain/events/stream?correlationId=sess-abc",
    );
  });

  it("cu token și correlationId → ambele în query (URLSearchParams)", () => {
    getStoredToken.mockReturnValue("tok");
    getSessionCorrelationId.mockReturnValue("cid-1");
    const u = buildBrainStreamUrl();
    expect(u.startsWith("https://api.example.com/api/v1/brain/events/stream?")).toBe(true);
    expect(u).toContain("token=tok");
    expect(u).toContain("correlationId=cid-1");
  });

  it("cu batchId → include batchId (UUID) în query", () => {
    getStoredToken.mockReturnValue(null);
    const batch = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    const u = buildBrainStreamUrl(batch);
    expect(u).toBe(
      `https://api.example.com/api/v1/brain/events/stream?batchId=${encodeURIComponent(batch)}`,
    );
  });
});
