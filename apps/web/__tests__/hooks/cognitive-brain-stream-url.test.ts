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

import { buildBrainStreamUrl } from "@/hooks/use-cognitive-brain.js";

describe("buildBrainStreamUrl", () => {
  beforeEach(() => {
    getStoredToken.mockReset();
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
});
