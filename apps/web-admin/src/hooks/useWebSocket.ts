import { useEffect, useRef, useState } from "react";
import { fetchLiveMetrics } from "../api.js";

export type WebSocketState = "connecting" | "connected" | "disconnected";

/**
 * Date live din același agregat ca `GET /api/admin/live` (proxy → Monitoring API).
 * În browser nu există WebSocket direct la :64080; polling-ul păstrează paritatea cu payload-ul WS intern `/ws/live`.
 */
export function useWebSocket<T = unknown>(onMessage?: (data: T) => void) {
  const [state, setState] = useState<WebSocketState>("disconnected");
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  useEffect(() => {
    let disposed = false;

    async function poll() {
      setState("connecting");
      try {
        const response = await fetchLiveMetrics();
        if (disposed || !response.success || !response.data) {
          if (!disposed) setState("disconnected");
          return;
        }
        const data = response.data as T;
        setLastMessage(data);
        setState("connected");
        onMessageRef.current?.(data);
      } catch {
        if (!disposed) setState("disconnected");
      }
    }

    void poll();
    const intervalId = setInterval(() => {
      void poll();
    }, 2000);
    return () => {
      disposed = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return { state, lastMessage };
}
