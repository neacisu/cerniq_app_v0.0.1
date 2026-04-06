import type { ReactNode } from "react";
import { Refine } from "@refinedev/core";
import { refineAuthenticatedFromAuth } from "@/lib/refine-auth.js";
import { useAuth } from "./auth-provider.js";
import { cerniqDataProvider } from "./data-provider.js";

/**
 * Refine: `dataProvider` spre `/api/v1`; `authProvider` delegat la același `useAuth` ca restul SPA.
 * Vezi `docs/developer-guide/refine-auth-data-provider.md`.
 */
export function CerniqRefineProvider({ children }: Readonly<{ children: ReactNode }>) {
  const auth = useAuth();

  return (
    <Refine
      dataProvider={cerniqDataProvider}
      authProvider={{
        login: async () => ({ success: false }),
        logout: async () => {
          auth.logout();
          return { success: true, redirectTo: "/login" };
        },
        check: async () => ({
          authenticated: refineAuthenticatedFromAuth(auth),
        }),
        getIdentity: async () =>
          auth.user
            ? { id: auth.user.id ?? auth.user.email, name: auth.user.name ?? auth.user.email }
            : null,
        onError: async () => ({ logout: false }),
      }}
    >
      {children}
    </Refine>
  );
}
