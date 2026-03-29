import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CognitiveBrain, CognitiveEvent, DataMutationRecord } from "@cerniq/shared";
import { ApiError, api } from "@/lib/api.js";
import { getApiBase } from "@/lib/api-url.js";

type TopologyResponse = { success: true; data: CognitiveBrain };
type TracesResponse = { success: true; data: CognitiveEvent[] };
type MutationsResponse = { success: true; data: DataMutationRecord[] };

function buildBrainStreamUrl(): string {
  const base = getApiBase().replace(/\/$/, "");
  return `${base}/api/v1/brain/events/stream`;
}

function parseCognitiveEventPayload(raw: string): CognitiveEvent | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    if (typeof o.nodeKey !== "string" || typeof o.eventType !== "string") return null;
    return {
      nodeKey: o.nodeKey,
      eventType: o.eventType,
      timestamp: typeof o.timestamp === "string" ? o.timestamp : new Date().toISOString(),
      data:
        typeof o.data === "object" && o.data !== null && !Array.isArray(o.data)
          ? (o.data as Record<string, unknown>)
          : {},
    };
  } catch {
    return null;
  }
}

export function useCognitiveBrain() {
  const query = useQuery({
    queryKey: ["cognitive-brain", "topology"],
    queryFn: () => api.get<TopologyResponse>("/api/v1/brain/topology"),
    refetchInterval: (q) => {
      if (q.state.error instanceof ApiError && q.state.error.status === 401) return false;
      return 30_000;
    },
    refetchIntervalInBackground: true,
    staleTime: 10_000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) return false;
      return failureCount < 3;
    },
  });

  const brain = query.data?.data;

  return {
    nodes: brain?.nodes ?? [],
    edges: brain?.edges ?? [],
    metadata: brain?.metadata,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCognitiveEventStream(onEvent: (event: CognitiveEvent) => void) {
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const eventSourceUnsupported = typeof EventSource === "undefined";

  const [connected, setConnected] = useState(false);
  const [streamError, setStreamError] = useState<Error | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  const error = eventSourceUnsupported
    ? new Error("EventSource nu este disponibil în acest mediu")
    : streamError;

  const disconnect = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setConnected(false);
  }, []);

  useEffect(() => {
    if (eventSourceUnsupported) {
      return;
    }

    const url = buildBrainStreamUrl();
    const es = new EventSource(url, { withCredentials: true });
    sourceRef.current = es;

    const handleOpen = () => {
      setStreamError(null);
      setConnected(true);
    };

    const handleMessage = (ev: MessageEvent<string>) => {
      const event = parseCognitiveEventPayload(ev.data);
      if (event) onEventRef.current(event);
    };

    const handleError = () => {
      setConnected(es.readyState === EventSource.OPEN);
      if (es.readyState === EventSource.CLOSED) {
        setStreamError(new Error("Fluxul SSE s-a închis"));
      }
    };

    es.addEventListener("open", handleOpen);
    es.addEventListener("message", handleMessage);
    es.addEventListener("error", handleError);

    return () => {
      es.removeEventListener("open", handleOpen);
      es.removeEventListener("message", handleMessage);
      es.removeEventListener("error", handleError);
      es.close();
      sourceRef.current = null;
      setConnected(false);
    };
  }, [eventSourceUnsupported]);

  return { connected, error, disconnect };
}

export function useNeuronInspector(nodeKey: string | null) {
  const tracesQuery = useQuery({
    queryKey: ["cognitive-brain", "traces", nodeKey],
    queryFn: () => {
      if (!nodeKey) {
        return Promise.reject(new Error("nodeKey lipsă"));
      }
      return api.get<TracesResponse>(`/api/v1/brain/traces/${encodeURIComponent(nodeKey)}`);
    },
    enabled: Boolean(nodeKey),
    retry: (failureCount, err) => {
      if (err instanceof ApiError && err.status === 401) return false;
      return failureCount < 3;
    },
  });

  const mutationsQuery = useQuery({
    queryKey: ["cognitive-brain", "mutations", nodeKey],
    queryFn: () => {
      if (!nodeKey) {
        return Promise.reject(new Error("nodeKey lipsă"));
      }
      return api.get<MutationsResponse>(`/api/v1/brain/mutations/${encodeURIComponent(nodeKey)}`);
    },
    enabled: Boolean(nodeKey),
    retry: (failureCount, err) => {
      if (err instanceof ApiError && err.status === 401) return false;
      return failureCount < 3;
    },
  });

  return {
    traces: tracesQuery.data?.data ?? [],
    mutations: mutationsQuery.data?.data ?? [],
    isLoading: tracesQuery.isLoading || mutationsQuery.isLoading,
    error: tracesQuery.error ?? mutationsQuery.error,
  };
}

export type CognitiveLodLevel = "minimal" | "standard" | "detailed";

export function useCognitiveLOD(zoomLevel: number) {
  return useMemo(() => {
    let lod: CognitiveLodLevel;
    if (zoomLevel < 0.5) {
      lod = "minimal";
    } else if (zoomLevel <= 1) {
      lod = "standard";
    } else {
      lod = "detailed";
    }

    return {
      lod,
      showEdgeLabels: lod !== "minimal",
      showMetrics: lod === "detailed",
      showNodeDetails: lod !== "minimal",
    };
  }, [zoomLevel]);
}
