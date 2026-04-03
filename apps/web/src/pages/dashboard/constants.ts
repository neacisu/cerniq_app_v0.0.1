export const LIVE_QUERY = {
  refetchInterval: 30_000,
  staleTime: 15_000,
  retry: 1,
} as const;

export const e1KpiTemplates = [
  {
    label: "Bronze Contacts",
    icon: "Database",
    color: "var(--color-tier-bronze)",
    path: "/bronze",
  },
  {
    label: "Silver Companies",
    icon: "Building2",
    color: "var(--color-tier-silver)",
    path: "/silver",
  },
  { label: "Gold Leads", icon: "Star", color: "var(--color-tier-gold)", path: "/gold" },
  {
    label: "Queue Depth",
    icon: "TrendingUp",
    color: "var(--color-ok)",
    path: "/enrichment/queue",
  },
] as const;
