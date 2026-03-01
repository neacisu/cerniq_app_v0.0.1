import { useEffect, useRef, useState } from "react";

const MAX_RECONNECT_DELAY_MS = 30000;
const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_CONSECUTIVE_FAILURES = 5;

function getWsUrl(): string {
  if (typeof window === "undefined") return "ws://localhost:64080/ws/live";
  const env = import.meta.env as { VITE_WS_URL?: string; DEV?: boolean };
  if (env.VITE_WS_URL && typeof env.VITE_WS_URL === "string") {
    const u = env.VITE_WS_URL.trim();
    if (u.startsWith("ws://") || u.startsWith("wss://")) return u;
    return u.startsWith("http") ? u.replace(/^http/, "ws") : `ws://${u.replace(/^\/\//, "")}`;
  }
  const { protocol, hostname, port } = window.location;
  const isSecure = protocol === "https:";
  const wsProtocol = isSecure ? "wss:" : "ws:";
  const defaultPort = isSecure ? "443" : "80";
  const portSuffix = port && port !== defaultPort ? `:${port}` : "";
  if (hostname === "localhost" || hostname === "127.0.0.1" || env.DEV) {
    return "ws://localhost:64080/ws/live";
  }
  const wsHost = hostname.replace(/^admin\./, "monitoring-api.");
  return `${wsProtocol}//${wsHost}${portSuffix}/ws/live`;
}

export type WebSocketState = "connecting" | "connected" | "disconnected";

export function useWebSocket<T = unknown>(onMessage?: (data: T) => void) {
  const [state, setState] = useState<WebSocketState>("disconnected");
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY_MS);
  const failureCountRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  useEffect(() => {
    const url = getWsUrl();
    let timeoutId: ReturnType<typeof setTimeout>;

    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;
      setState("connecting");
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        failureCountRef.current = 0;
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
        setState("connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as T;
          setLastMessage(data);
          onMessageRef.current?.(data);
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        setState("disconnected");
        if (failureCountRef.current >= MAX_CONSECUTIVE_FAILURES) return;
        failureCountRef.current += 1;
        const delay = Math.min(reconnectDelayRef.current, MAX_RECONNECT_DELAY_MS);
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, MAX_RECONNECT_DELAY_MS);
        timeoutId = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // onclose will run after
      };
    }

    connect();
    return () => {
      clearTimeout(timeoutId);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  return { state, lastMessage };
}
