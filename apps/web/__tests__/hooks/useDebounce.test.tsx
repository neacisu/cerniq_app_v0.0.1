import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/hooks/useDebounce.js";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("întârzie actualizarea valorii debounced", () => {
    const { result, rerender } = renderHook(
      ({ v, d }: { v: string; d: number }) => useDebounce(v, d),
      {
        initialProps: { v: "a", d: 100 },
      },
    );
    expect(result.current).toBe("a");

    rerender({ v: "b", d: 100 });
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("b");
  });
});
