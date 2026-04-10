import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getStoredToken } from "@/lib/api.js";
import { getApiBase } from "@/lib/api-url.js";
import { getSessionCorrelationId } from "@/lib/report-client-error.js";
import type { ApiDataEnvelope, DashboardStatsPayload } from "@/types/api.js";

const STATS_QUERY_KEY = ["etapa1", "dashboard", "stats"] as const;

function buildKpiStreamUrl(): string {
  const base = getApiBase().replace(/\/$/, "");
  const token = getStoredToken();
  const cid = getSessionCorrelationId();
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (cid) params.set("correlationId", cid);
  const q = params.toString();
  let url = `${base}/api/v1/dashboard/kpi-stream`;
  if (q) url += `?${q}`;
  return url;
}

/**
 * Flux SSE: același payload ca GET /dashboard/stats — scrie în cache React Query.
 * EventSource reîncearcă reconectarea automat; dezactivați polling-ul când `sseConnected`.
 */
export function useDashboardKpiStream(enabled: boolean) {
  const qc = useQueryClient();
  const [sseConnected, setSseConnected] = useState(false);

  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") return undefined;
    if (!getStoredToken()) return undefined;

    const es = new EventSource(buildKpiStreamUrl(), { withCredentials: true });
    es.onopen = () => setSseConnected(true);
    es.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data) as {
          type?: string;
          data?: DashboardStatsPayload;
        };
        if (parsed.type === "kpi" && parsed.data) {
          qc.setQueryData<ApiDataEnvelope<DashboardStatsPayload>>(STATS_QUERY_KEY, {
            success: true,
            data: parsed.data,
          });
        }
      } catch {
        /* ignore */
      }
    };
    es.onerror = () => setSseConnected(false);

    return () => {
      es.close();
      setSseConnected(false);
    };
  }, [enabled, qc]);

  return { sseConnected };
}
