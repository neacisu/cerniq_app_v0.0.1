import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./lib/api.js";

/** QueryClient partajat — App + teste (policy retry, integrare QueryClientProvider). */
export const appQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 401) return false;
        return failureCount < 3;
      },
    },
  },
});
