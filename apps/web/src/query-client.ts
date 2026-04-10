import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "./lib/api.js";
import { reportClientError } from "./lib/report-client-error.js";

/**
 * Erori care nu trec prin apiFetch (ex. parsing) — raportare ușoară, fără dublu toast
 * (api.ts afișează deja toast pentru 5xx la apelurile centralizate).
 */
function onGlobalQueryMutationError(error: unknown): void {
  if (error instanceof ApiError) return;
  void reportClientError({
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : "ReactQueryError",
    stack: error instanceof Error ? error.stack : undefined,
  });
}

/** QueryClient partajat — App + teste (policy retry, integrare QueryClientProvider). */
export const appQueryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: onGlobalQueryMutationError,
  }),
  mutationCache: new MutationCache({
    onError: onGlobalQueryMutationError,
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 401) return false;
        return failureCount < 3;
      },
    },
  },
});
