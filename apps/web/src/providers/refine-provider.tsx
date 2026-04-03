import type { ReactNode } from "react";
import { Refine } from "@refinedev/core";
import { useAuth } from "./auth-provider.js";
import { cerniqDataProvider } from "./data-provider.js";

/**
 * Refine authProvider mirrors AuthProvider: no false "always authenticated" while token exists.
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
          authenticated: Boolean(auth.user),
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
