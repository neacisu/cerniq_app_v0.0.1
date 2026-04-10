import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/providers/theme-provider.js";
import { useTheme } from "@/providers/theme-context.js";

function Probe() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button type="button" onClick={toggleTheme}>
      theme:{theme}
    </button>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.removeItem("cerniq-theme");
    delete document.documentElement.dataset.theme;
  });

  it("persistă tema și actualizează documentElement", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset.theme).toMatch(/dark|light/);
    await user.click(screen.getByRole("button"));
    expect(localStorage.getItem("cerniq-theme")).toBeTruthy();
  });
});
