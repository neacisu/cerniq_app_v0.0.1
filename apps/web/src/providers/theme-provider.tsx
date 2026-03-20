import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeContext, type Theme } from "./theme-context.js";

const THEME_STORAGE_KEY = "cerniq-theme";

function getStoredTheme(): Theme {
  const browserWindow = globalThis.window;
  if (!browserWindow) {
    return "dark";
  }

  const persistedTheme = browserWindow.localStorage.getItem(THEME_STORAGE_KEY);
  return persistedTheme === "light" || persistedTheme === "dark" ? persistedTheme : "dark";
}

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [theme, setTheme] = useState<Theme>(() => {
    return getStoredTheme();
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    globalThis.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
