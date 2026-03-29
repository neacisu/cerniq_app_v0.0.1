import { z } from "zod";
import { loadSecretsFromFile } from "@cerniq/worker-shared";

const API_SECRETS_PATH = process.env.SECRETS_PATH ?? "/secrets/api.env";

loadSecretsFromFile(false, API_SECRETS_PATH, { exitOnMissing: true });

if (!process.env.JWT_REFRESH_SECRET && process.env.JWT_SECRET) {
  process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET;
}

/** Reload secrets from file (e.g. on SIGHUP). Overwrites secret keys so new credentials take effect. */
export function reloadSecretsFromFile(): void {
  loadSecretsFromFile(true, API_SECRETS_PATH);
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(64010),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  DATABASE_URL: z.url(),
  POSTGRES_USER: z.string().optional(),
  POSTGRES_PASSWORD: z.string().optional(),
  REDIS_URL: z.url(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_PREFIX: z.string().optional(),
  BULLMQ_PREFIX: z.string().optional(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  CORS_ORIGIN: z.string().default("*"),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.string().default("1 minute"),
  CSP_POLICY: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default("https://otel-cerniq.neanelu.ro"),
  ADMIN_KEY: z.string().optional(),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().default(10000),
  /**
   * Base URL of the internal Monitoring API container.
   * Uses plain HTTP because traffic is confined to the Docker bridge network
   * (cerniq_backend) and never transits a public interface.
   * Override with an https:// URL if TLS termination is added to the sidecar.
   */
  MONITORING_API_INTERNAL_URL: z.url().default("https://cerniq-monitoring-api:64080"),
});

function parseEnv(): z.infer<typeof EnvSchema> {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      "Missing or invalid environment variables:",
      z.flattenError(parsed.error).fieldErrors,
    );
    console.error("Ensure OpenBao agent has rendered secrets to SECRETS_PATH.");
    process.exit(1);
  }
  return parsed.data;
}

const envConfigRef = parseEnv();
export const envConfig = envConfigRef;
export type EnvConfig = z.infer<typeof EnvSchema>;

/** Re-parse env after reloadSecretsFromFile (e.g. on SIGHUP). Updates envConfig in place. */
export function refreshEnvConfig(): void {
  loadSecretsFromFile(true, API_SECRETS_PATH);
  if (!process.env.JWT_REFRESH_SECRET && process.env.JWT_SECRET) {
    process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET;
  }
  const parsed = EnvSchema.safeParse(process.env);
  if (parsed.success) {
    Object.assign(envConfigRef, parsed.data);
  } else {
    console.error(
      "refreshEnvConfig: re-parse failed",
      parsed.error ? z.flattenError(parsed.error).fieldErrors : undefined,
    );
  }
}
