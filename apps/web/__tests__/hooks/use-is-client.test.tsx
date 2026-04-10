import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIsClient } from "@/hooks/use-is-client.js";

describe("useIsClient", () => {
  it("în jsdom raportează true după montare (client snapshot)", () => {
    const { result } = renderHook(() => useIsClient());
    expect(result.current).toBe(true);
  });
});
