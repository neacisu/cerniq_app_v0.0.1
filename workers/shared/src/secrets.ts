import fs from "node:fs";

const DEFAULT_SECRETS_PATH = "/secrets/workers.env";
const SENSITIVE_KEYS = new Set([
  "DATABASE_URL",
  "DATABASE_DIRECT_URL",
  "REDIS_URL",
  "REDIS_PASSWORD",
  "REDIS_PREFIX",
  "BULLMQ_PREFIX",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
]);
const OPENBAO_READY_MARKER = "OPENBAO_SECRETS_LOADED=true";

export interface LoadSecretsOptions {
  /** Overwrite existing env vars for sensitive keys (default: false). */
  forceOverwrite?: boolean;
  /**
   * When true, forceOverwrite applies to ALL keys, not just SENSITIVE_KEYS.
   * Used by monitoring-api which needs universal overwrite on reload.
   */
  universalOverwrite?: boolean;
  /**
   * Exit process if the secrets file is missing (default: false).
   * API server sets this to true because it cannot start without secrets.
   */
  exitOnMissing?: boolean;
  /**
   * Ordered list of paths to search for the secrets file (first existing wins).
   * Used by migrate-cli which searches multiple locations.
   */
  searchPaths?: string[];
}

/**
 * Unified secrets loader — consolidates 4 previous implementations.
 *
 * Usage examples:
 *   loadSecretsFromFile(false, '/secrets/workers.env')  // workers (original API)
 *   loadSecretsFromFile(false, '/secrets/api.env', { exitOnMissing: true })  // API
 *   loadSecretsFromFile(true, '/secrets/api.env', { universalOverwrite: true })  // monitoring-api reload
 *   loadSecretsFromFile(false, undefined, { searchPaths: ['/opt/...', '/secrets/...'] })  // migrate-cli
 */
export function loadSecretsFromFile(
  forceOverwrite = false,
  path = DEFAULT_SECRETS_PATH,
  options?: LoadSecretsOptions,
): void {
  const { universalOverwrite = false, exitOnMissing = false, searchPaths } = options ?? {};

  const shouldForceOverwrite = forceOverwrite || options?.forceOverwrite === true;

  let resolvedPath = path;
  if (searchPaths && searchPaths.length > 0) {
    const found = searchPaths.find((p) => fs.existsSync(p));
    if (!found) {
      if (exitOnMissing) {
        process.exit(1);
      }
      return;
    }
    resolvedPath = found;
  } else if (!fs.existsSync(resolvedPath)) {
    if (exitOnMissing) {
      process.exit(1);
    }
    return;
  }

  const content = fs.readFileSync(resolvedPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();

    if (shouldForceOverwrite && (universalOverwrite || SENSITIVE_KEYS.has(key))) {
      process.env[key] = value;
      continue;
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

function isSecretsFileReady(path: string): boolean {
  if (!fs.existsSync(path)) return false;
  const content = fs.readFileSync(path, "utf-8");
  return content.includes(OPENBAO_READY_MARKER);
}

export function watchSecretsFile(
  path: string,
  onReload: () => void | Promise<void>,
  pollIntervalMs = 2000,
): () => void {
  let reloading = false;

  fs.watchFile(path, { interval: pollIntervalMs }, async (curr, prev) => {
    if (reloading) return;
    if (curr.mtimeMs === prev.mtimeMs && curr.size === prev.size) return;
    if (!isSecretsFileReady(path)) return;

    reloading = true;
    try {
      await onReload();
    } catch (error) {
      console.error("[secrets-watch] reload failed", error);
    } finally {
      reloading = false;
    }
  });

  return () => fs.unwatchFile(path);
}
