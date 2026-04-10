import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { Decorator } from "@storybook/react-vite";
import { ThemeProvider } from "../src/providers/theme-provider.js";
import { AuthProvider } from "../src/providers/auth-provider.js";
import { CerniqRefineProvider } from "../src/providers/refine-provider.js";
import { seedStorybookAuth } from "../src/lib/storybook-auth-seed.js";

const storyQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 60_000,
    },
    mutations: { retry: false },
  },
});

function StorybookProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  seedStorybookAuth();
  return (
    <QueryClientProvider client={storyQueryClient}>
      <ThemeProvider>
        <AuthProvider>
          <CerniqRefineProvider>{children}</CerniqRefineProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/** Stack apropiat de aplicație: router + React Query + temă + auth + Refine (MSW furnizează /me). */
export const withAppShell: Decorator = (Story) => (
  <MemoryRouter initialEntries={["/"]}>
    <StorybookProviders>
      <div className="min-h-[40vh] bg-[var(--color-s950)] text-[var(--color-t1)] antialiased">
        <Story />
      </div>
    </StorybookProviders>
  </MemoryRouter>
);

/** Pentru stories care aduc propriul MemoryRouter (ex. pagini la cale fixă). Fără dublu-router. */
export const withStorybookProvidersOnly: Decorator = (Story) => (
  <StorybookProviders>
    <div className="min-h-[40vh] bg-[var(--color-s950)] text-[var(--color-t1)] antialiased">
      <Story />
    </div>
  </StorybookProviders>
);

/** Doar temă + fundal (componente fără auth/router). */
export const withThemeOnly: Decorator = (Story) => (
  <ThemeProvider>
    <div className="min-h-[20vh] bg-[var(--color-s950)] p-4 text-[var(--color-t1)] antialiased">
      <Story />
    </div>
  </ThemeProvider>
);

/** Alege shell-ul global: componente folosesc withAppShell; `parameters.storybookSkipAppShell` → doar provideri. */
export function createConditionalAppShellDecorator(
  withShell: Decorator,
  providersOnly: Decorator,
): Decorator {
  return (Story, context) => {
    if (context.parameters.storybookSkipAppShell) {
      return providersOnly(Story, context);
    }
    return withShell(Story, context);
  };
}
