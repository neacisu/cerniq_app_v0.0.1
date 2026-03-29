/**
 * React hooks pentru Cognitive Brain Control Plane.
 *
 * Hook-uri exportate:
 *   - useCognitiveBrain(batchId?)        — topology query cu refetch 30s, optional per-batch
 *   - useCognitiveEventStream(onEvent)   — SSE cu exponential backoff 1s–60s + Last-Event-ID nativ
 *   - useNeuronInspector(nodeKey, batchId?) — traces per nod + mutations per batch
 *   - useNeuronControl(nodeKey)          — pause/resume/config cu optimistic UI
 *   - useCognitiveLOD(zoomLevel, nodeCount?) — Level of Detail bazat pe zoom și număr noduri
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CognitiveBrain,
  CognitiveEvent,
  DataMutationRecord,
  CognitiveApplyStatus,
} from "@cerniq/shared";
import { getStoredToken, ApiError, api } from "@/lib/api.js";
import { getApiBase } from "@/lib/api-url.js";

// ─── Response types ───────────────────────────────────────────────────────────

type TopologyResponse = { success: true; data: CognitiveBrain };
type TracesResponse = {
  success: true;
  data: CognitiveEvent[];
  meta: { nodeKey: string; limit: number; total: number };
};
type MutationsResponse = { success: true; data: DataMutationRecord[] };

type PauseResponse = {
  success: true;
  nodeKey: string;
  status: "PAUSED";
  propagated: boolean;
  batchId: string | null;
};

type ResumeResponse = {
  success: true;
  nodeKey: string;
  status: "ACTIVE";
};

type ConfigRow = {
  tenantId: string;
  nodeKey: string;
  concurrency: number;
  rateLimitMax: number | null;
  rateLimitDuration: number | null;
  paused: boolean;
  applyStatus: CognitiveApplyStatus;
  appliedAt: string | null;
  appliedByWorkerInstance: string | null;
};

type ConfigResponse = {
  success: true;
  data: ConfigRow;
  meta: {
    applyStatus: CognitiveApplyStatus;
    requiresWorkerRestart: boolean;
  };
};

/**
 * Input pentru `PUT /api/v1/brain/nodes/:nodeKey/config`.
 * Cel puțin un câmp trebuie specificat (validat server-side).
 */
export type NodeConfigInput = {
  concurrency?: number;
  rateLimitMax?: number;
  rateLimitDuration?: number;
  paused?: boolean;
};

// ─── Constante backoff SSE ────────────────────────────────────────────────────

/** Delay minim de reconnect SSE în ms (1 secundă). */
export const SSE_BACKOFF_MIN_MS = 1_000;
/** Delay maxim de reconnect SSE în ms (60 secunde). */
export const SSE_BACKOFF_MAX_MS = 60_000;

// ─── Helpers URL ──────────────────────────────────────────────────────────────

function buildBrainStreamUrl(): string {
  const base = getApiBase().replace(/\/$/, "");
  const base_url = `${base}/api/v1/brain/events/stream`;
  // EventSource nativ nu poate trimite Authorization header.
  // Token-ul JWT din localStorage este pasat ca ?token= pentru autentificare SSE.
  const token = getStoredToken();
  if (!token) return base_url;
  return `${base_url}?token=${encodeURIComponent(token)}`;
}

function parseCognitiveEventPayload(raw: string): CognitiveEvent | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    if (typeof o.nodeKey !== "string" || typeof o.eventType !== "string") return null;
    return {
      id: typeof o.id === "number" ? o.id : undefined,
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

// ─── useCognitiveBrain ────────────────────────────────────────────────────────

/**
 * Fetches topology graph din `/api/v1/brain/topology`.
 * Cu `batchId`, returnează live state per batch din `import_cognitive_nodes` + `import_cognitive_edges`.
 * Fără `batchId`, returnează topology globală din catalog + Redis pause flags.
 *
 * Refetch automat la 30s, stop la 401.
 */
export function useCognitiveBrain(batchId?: string) {
  const query = useQuery({
    queryKey: ["cognitive-brain", "topology", batchId ?? null],
    queryFn: () => {
      const path = batchId
        ? `/api/v1/brain/topology?batchId=${encodeURIComponent(batchId)}`
        : "/api/v1/brain/topology";
      return api.get<TopologyResponse>(path);
    },
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

// ─── useCognitiveEventStream ──────────────────────────────────────────────────

/**
 * Deschide un flux SSE la `/api/v1/brain/events/stream`.
 *
 * Comportament:
 * - EventSource nativ trimite `Last-Event-ID` automat la reconectare nativă (browser-managed).
 * - La `readyState === CLOSED` (browser a renunțat): implementăm reconnect manual cu
 *   exponential backoff: 1s → 2s → 4s → ... → 60s (cap).
 * - `disconnect()`: oprire permanentă (fără auto-reconnect). Resetat la remount.
 * - Backoff reset la 1s la fiecare reconectare cu succes (open).
 */
export function useCognitiveEventStream(onEvent: (event: CognitiveEvent) => void) {
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const eventSourceUnsupported = typeof EventSource === "undefined";

  const [connected, setConnected] = useState(false);
  const [streamError, setStreamError] = useState<Error | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const backoffMsRef = useRef<number>(SSE_BACKOFF_MIN_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // stoppedRef previne auto-reconnect după disconnect() sau unmount
  const stoppedRef = useRef<boolean>(false);

  const error = eventSourceUnsupported
    ? new Error("EventSource nu este disponibil în acest mediu")
    : streamError;

  /**
   * Oprire permanentă a stream-ului SSE.
   * Anulează timer-ul de reconnect curent și închide EventSource-ul.
   * Auto-reconnect nu va mai rula până la remount.
   */
  const disconnect = useCallback(() => {
    stoppedRef.current = true;
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    sourceRef.current?.close();
    sourceRef.current = null;
    setConnected(false);
  }, []);

  useEffect(() => {
    if (eventSourceUnsupported) return;

    // Reset la fiecare mount — permite reconectare după remount
    stoppedRef.current = false;
    backoffMsRef.current = SSE_BACKOFF_MIN_MS;

    function connect(): void {
      if (stoppedRef.current) return;

      const url = buildBrainStreamUrl();
      const es = new EventSource(url, { withCredentials: true });
      sourceRef.current = es;

      const handleOpen = (): void => {
        setStreamError(null);
        setConnected(true);
        // Reset backoff la reconectare cu succes
        backoffMsRef.current = SSE_BACKOFF_MIN_MS;
      };

      const handleMessage = (ev: MessageEvent<string>): void => {
        const event = parseCognitiveEventPayload(ev.data);
        if (event) onEventRef.current(event);
      };

      const handleError = (): void => {
        setConnected(es.readyState === EventSource.OPEN);

        if (es.readyState === EventSource.CLOSED) {
          // Browser a renunțat la reconectare nativă → implementăm backoff manual
          setStreamError(new Error("Fluxul SSE s-a închis"));
          es.removeEventListener("open", handleOpen);
          es.removeEventListener("message", handleMessage);
          es.removeEventListener("error", handleError);
          es.close();

          // Evită suprascrierea unui sourceRef actualizat ulterior
          if (sourceRef.current === es) sourceRef.current = null;

          if (!stoppedRef.current) {
            const delay = backoffMsRef.current;
            // Exponential backoff: dublare la fiecare eșec, cap la SSE_BACKOFF_MAX_MS
            backoffMsRef.current = Math.min(backoffMsRef.current * 2, SSE_BACKOFF_MAX_MS);
            reconnectTimerRef.current = setTimeout(connect, delay);
          }
        }
      };

      es.addEventListener("open", handleOpen);
      es.addEventListener("message", handleMessage);
      es.addEventListener("error", handleError);
    }

    connect();

    return () => {
      stoppedRef.current = true;
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [eventSourceUnsupported]);

  return { connected, error, disconnect };
}

// ─── useNeuronInspector ───────────────────────────────────────────────────────

/**
 * Fetches traces (events) și mutations pentru un nod cognitiv.
 *
 * - traces: `GET /api/v1/brain/nodes/:nodeKey/traces` — enabled când nodeKey prezent
 * - mutations: `GET /api/v1/brain/mutations/:batchId` — enabled DOAR când batchId prezent
 *
 * Separarea este intenționată: traces sunt per-nod (oricând), mutations sunt per-batch
 * (necesită context de import activ).
 */
export function useNeuronInspector(nodeKey: string | null, batchId?: string) {
  const tracesQuery = useQuery({
    queryKey: ["cognitive-brain", "traces", nodeKey],
    queryFn: () => {
      if (!nodeKey) return Promise.reject(new Error("nodeKey lipsă"));
      return api.get<TracesResponse>(`/api/v1/brain/nodes/${encodeURIComponent(nodeKey)}/traces`);
    },
    enabled: Boolean(nodeKey),
    retry: (failureCount, err) => {
      if (err instanceof ApiError && err.status === 401) return false;
      return failureCount < 3;
    },
  });

  const mutationsQuery = useQuery({
    queryKey: ["cognitive-brain", "mutations", batchId ?? null],
    queryFn: () => {
      if (!batchId) return Promise.reject(new Error("batchId lipsă"));
      return api.get<MutationsResponse>(`/api/v1/brain/mutations/${encodeURIComponent(batchId)}`);
    },
    enabled: Boolean(batchId),
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

// ─── useNeuronControl ─────────────────────────────────────────────────────────

/**
 * Oferă acțiuni de control runtime pentru un nod cognitiv.
 *
 * Acțiuni:
 *   - `pause(batchId?)` — POST /pause cu propagatePause BFS dacă batchId prezent
 *   - `resume()`        — POST /resume (elimină Redis pause flag)
 *   - `updateConfig(config)` — PUT /config cu applyStatus distinction
 *
 * Optimistic UI:
 *   - `optimisticPaused` reflectă imediat starea dorită (true/false) pe durata mutației.
 *   - La succes sau eroare, `optimisticPaused` revine la `null` (starea reală din server).
 *   - La succes, invalidează `["cognitive-brain", "topology"]` pentru refresh date fresh.
 *
 * RBAC: pause/resume/config necesită rol `admin` (verificat server-side).
 */
export function useNeuronControl(nodeKey: string | null) {
  const queryClient = useQueryClient();
  const [optimisticPaused, setOptimisticPaused] = useState<boolean | null>(null);

  const pauseMutation = useMutation<PauseResponse, Error, string | undefined>({
    mutationFn: (batchId) => {
      if (!nodeKey) return Promise.reject(new Error("nodeKey lipsă pentru pause"));
      return api.post<PauseResponse>(
        `/api/v1/brain/nodes/${encodeURIComponent(nodeKey)}/pause`,
        batchId === undefined ? {} : { batchId },
      );
    },
    onMutate: async () => {
      // Optimistic: marchează imediat ca PAUSED în UI
      setOptimisticPaused(true);
      // Anulează fetch-uri în zbor care ar suprascrie starea optimistă
      await queryClient.cancelQueries({ queryKey: ["cognitive-brain", "topology"] });
    },
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: ["cognitive-brain", "topology"] })
        .catch(() => undefined);
      setOptimisticPaused(null);
    },
    onError: () => {
      // Rollback optimistic state la eroare
      setOptimisticPaused(null);
    },
  });

  const resumeMutation = useMutation<ResumeResponse, Error, void>({
    mutationFn: () => {
      if (!nodeKey) return Promise.reject(new Error("nodeKey lipsă pentru resume"));
      return api.post<ResumeResponse>(`/api/v1/brain/nodes/${encodeURIComponent(nodeKey)}/resume`);
    },
    onMutate: async () => {
      // Optimistic: marchează imediat ca ACTIVE (not paused) în UI
      setOptimisticPaused(false);
      await queryClient.cancelQueries({ queryKey: ["cognitive-brain", "topology"] });
    },
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: ["cognitive-brain", "topology"] })
        .catch(() => undefined);
      setOptimisticPaused(null);
    },
    onError: () => {
      setOptimisticPaused(null);
    },
  });

  const configMutation = useMutation<ConfigResponse, Error, NodeConfigInput>({
    mutationFn: (config) => {
      if (!nodeKey) return Promise.reject(new Error("nodeKey lipsă pentru config"));
      return api.put<ConfigResponse>(
        `/api/v1/brain/nodes/${encodeURIComponent(nodeKey)}/config`,
        config,
      );
    },
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: ["cognitive-brain", "topology"] })
        .catch(() => undefined);
    },
  });

  return {
    /** Inițiază pauza nodului, cu propagare BFS dacă `batchId` e furnizat. */
    pause: (batchId?: string) => pauseMutation.mutate(batchId),
    /** Elimină flag-ul de pauză al nodului. */
    resume: () => resumeMutation.mutate(),
    /** Actualizează configurația runtime a nodului (concurrency, rate limit, paused). */
    updateConfig: (config: NodeConfigInput) => configMutation.mutate(config),
    /** true când `pause()` este în curs. */
    isPausing: pauseMutation.isPending,
    /** true când `resume()` este în curs. */
    isResuming: resumeMutation.isPending,
    /** true când `updateConfig()` este în curs. */
    isUpdatingConfig: configMutation.isPending,
    /** Eroarea ultimei operații de pauză (null dacă nu există). */
    pauseError: pauseMutation.error,
    /** Eroarea ultimei operații de resume (null dacă nu există). */
    resumeError: resumeMutation.error,
    /** Eroarea ultimei actualizări de config (null dacă nu există). */
    configError: configMutation.error,
    /**
     * Starea optimistă a pauzei:
     * - `true`  → pauza în curs, nodul considerat pauzat
     * - `false` → resume în curs, nodul considerat activ
     * - `null`  → nicio mutație în curs, se folosește starea reală din server
     */
    optimisticPaused,
    /** Metadatele aplicate ale ultimei configurații (applyStatus + requiresWorkerRestart). */
    configResult: configMutation.data?.meta ?? null,
    /** Răspunsul serverului la ultimul pause (cu batchId și propagated). */
    lastPauseResult: pauseMutation.data ?? null,
    /** Răspunsul serverului la ultimul resume. */
    lastResumeResult: resumeMutation.data ?? null,
  };
}

// ─── useCognitiveLOD ──────────────────────────────────────────────────────────

/**
 * Nivelul de detaliu (Level of Detail) al vizualizării ReactFlow.
 * - `minimal`  — swimlane aggregates, fără etichete/metrici
 * - `standard` — noduri cu status, fără metrici detaliate
 * - `detailed` — toate detaliile: metrici, etichete muchii, tooltip-uri
 */
export type CognitiveLodLevel = "minimal" | "standard" | "detailed";

/** Ordinea LOD: minimal < standard < detailed (numerică pentru comparații). */
const LOD_ORDER: Readonly<Record<CognitiveLodLevel, number>> = {
  minimal: 0,
  standard: 1,
  detailed: 2,
};

function zoomToLod(zoom: number): CognitiveLodLevel {
  if (zoom < 0.5) return "minimal";
  if (zoom <= 1) return "standard";
  return "detailed";
}

function countToLod(nodeCount: number): CognitiveLodLevel {
  if (nodeCount > 500) return "minimal";
  if (nodeCount > 250) return "standard";
  return "detailed";
}

/**
 * Calculează LOD pe baza zoom-ului ReactFlow și, opțional, a numărului de noduri.
 *
 * LOD final = cel mai conservator dintre LOD-zoom și LOD-count:
 *   - 600 noduri la zoom 2.0 → LOD-count=minimal câștigă față de LOD-zoom=detailed
 *   - 118 noduri la zoom 0.3 → LOD-zoom=minimal câștigă față de LOD-count=detailed
 *
 * Overload `nodeCount?`:
 *   - > 500 noduri → minimal (forțat, indiferent de zoom)
 *   - 251–500 noduri → standard (forțat dacă zoom ar da detailed)
 *   - ≤ 250 noduri → detailed (permis, zoom rămâne decisiv)
 *   - undefined → doar zoom determină LOD (backwards compatible)
 *
 * Notă aplicație: catalogul are 118 noduri (E1+E2) — ≤ 250 → zoom este decisiv,
 * nu se forțează niciodată minimal prin count la zoom normal (≥ 0.5).
 */
export function useCognitiveLOD(zoomLevel: number, nodeCount?: number) {
  return useMemo(() => {
    const zoomLod = zoomToLod(zoomLevel);
    const countLod: CognitiveLodLevel =
      nodeCount === undefined ? "detailed" : countToLod(nodeCount);

    // LOD final: cel mai conservator câștigă
    const lod: CognitiveLodLevel = LOD_ORDER[zoomLod] <= LOD_ORDER[countLod] ? zoomLod : countLod;

    return {
      lod,
      showEdgeLabels: lod !== "minimal",
      showMetrics: lod === "detailed",
      showNodeDetails: lod !== "minimal",
    };
  }, [zoomLevel, nodeCount]);
}
