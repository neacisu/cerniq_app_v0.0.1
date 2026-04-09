import { useQuery } from "@tanstack/react-query";
import { fetchSystemProcesses } from "@/lib/system-processes-api.js";

export function useBackgroundProcesses(enabled = true) {
  return useQuery({
    queryKey: ["background-processes"],
    queryFn: () => fetchSystemProcesses(),
    refetchInterval: 5000,
    staleTime: 2000,
    enabled,
  });
}
