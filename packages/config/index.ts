export const CONFIG_PACKAGE = "@cerniq/config";

/**
 * Porturi canonice ale stack-ului aplicație (64000–64099).
 * Aliniere: `infra/docker/docker-compose*.yml`, `apps/web/vite.config.ts`, `apps/web-admin/vite.config.ts`,
 * `docs/specifications/Etapa 0/etapa0-port-matrix.md`, ADR-0022.
 */
export const CERNIQ_APP_SERVICE_PORTS = {
  web: 64000,
  api: 64010,
  webAdmin: 64012,
  pgbouncer: 64033,
  monitoringApi: 64080,
  cadvisor: 64094,
  pgbouncerExporterHost: 64095,
} as const;
