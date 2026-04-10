import { useQuery } from "@tanstack/react-query";
import {
  fetchCreditStats,
  fetchOrderStats,
  fetchOrdersList,
  fetchPaymentsSummary,
  fetchShipmentStats,
  fetchShipmentsList,
  fetchTenantPayments,
} from "@/lib/etapa4-api.js";

const POLL_MS = 10_000;

async function loadPostsaleDashboardBundle() {
  const [orders, credit, ship, paySum] = await Promise.all([
    fetchOrderStats(),
    fetchCreditStats(),
    fetchShipmentStats(),
    fetchPaymentsSummary(30),
  ]);
  return { orders, credit, ship, paySum };
}

/** Polling 10s — KPI + volume plăți + statistici comenzi/credit/livrări. */
export function usePostsaleDashboard() {
  return useQuery({
    queryKey: ["etapa4", "postsale", "dashboard"],
    queryFn: loadPostsaleDashboardBundle,
    refetchInterval: POLL_MS,
    staleTime: 5_000,
  });
}

/** Polling 10s — listă plăți recente (live updates fără WebSocket). */
export function usePaymentStream() {
  return useQuery({
    queryKey: ["etapa4", "payments", "stream"],
    queryFn: () => fetchTenantPayments({ limit: 30, page: 1 }),
    refetchInterval: POLL_MS,
    staleTime: 3_000,
  });
}

export type ActivityEventType = "PAYMENT" | "CREDIT" | "LOGISTICS" | "RETURN";

export type ActivityFeedItem = {
  id: string;
  type: ActivityEventType;
  title: string;
  subtitle: string;
  at: string;
};

async function loadActivityFeed(): Promise<ActivityFeedItem[]> {
  const [payments, shipments, returns] = await Promise.all([
    fetchTenantPayments({ limit: 12, page: 1 }),
    fetchShipmentsList({ limit: 10, page: 1 }),
    fetchOrdersList({ limit: 10, page: 1, status: "RETURNED" }),
  ]);

  const items: ActivityFeedItem[] = [];

  for (const p of payments.data ?? []) {
    const ts = p.receivedAt ?? p.createdAt;
    items.push({
      id: `pay-${p.id}`,
      type: "PAYMENT",
      title: `Plată ${p.currency} ${Number(p.amount).toLocaleString("ro-RO")}`,
      subtitle: p.companyName?.trim() ? p.companyName : (p.counterpartyName ?? "—"),
      at: ts,
    });
  }

  for (const s of shipments.data ?? []) {
    items.push({
      id: `ship-${s.id}`,
      type: "LOGISTICS",
      title: `Livrare AWB ${s.awbNumber?.trim() ? s.awbNumber : s.id.slice(0, 8)}`,
      subtitle: `${s.status} — ${s.companyName?.trim() ? s.companyName : "—"}`,
      at: s.createdAt,
    });
  }

  for (const o of returns.data ?? []) {
    items.push({
      id: `ret-${o.id}`,
      type: "RETURN",
      title: `Retur comandă ${o.orderNumber}`,
      subtitle: `${o.status} — ${o.companyName?.trim() ? o.companyName : "—"}`,
      at: o.updatedAt ?? o.createdAt,
    });
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return items.slice(0, 20);
}

export function usePostsaleActivityFeed() {
  return useQuery({
    queryKey: ["etapa4", "postsale", "activity-feed"],
    queryFn: loadActivityFeed,
    refetchInterval: POLL_MS,
    staleTime: 5_000,
  });
}
