import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTheme, ThemeContext } from "@/providers/theme-context.js";
import type { ThemeContextType } from "@/providers/theme-context.js";

describe("useTheme", () => {
  it("aruncă fără ThemeProvider", () => {
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow(/useTheme must be used within ThemeProvider/);
  });

  it("returnează context când e furnizat", () => {
    const value: ThemeContextType = {
      theme: "dark",
      setTheme: vi.fn(),
      toggleTheme: vi.fn(),
    };
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
      ),
    });
    expect(result.current.theme).toBe("dark");
  });
});
