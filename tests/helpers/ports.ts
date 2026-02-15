// Port Matrix (per ADR-0022 "Port Allocation Strategy" - Cerniq uses 64xxx range).
export const CERNIQ_PORTS = {
  postgres: 64032,
  pgbouncer: 64033,
  redis: 64039,
} as const;
