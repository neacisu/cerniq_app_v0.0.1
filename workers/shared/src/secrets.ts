import fs from "node:fs";

const DEFAULT_SECRETS_PATH = "/secrets/workers.env";
const SENSITIVE_KEYS = new Set([
  "DATABASE_URL",
  "DATABASE_DIRECT_URL",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "REDIS_URL",
  "REDIS_PASSWORD",
  "REDIS_PREFIX",
  "BULLMQ_PREFIX",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
]);
const OPENBAO_READY_MARKER = "OPENBAO_SECRETS_LOADED=true";

export interface LoadSecretsOptions {
  /** Overwrite existing env vars for sensitive keys (default: false) */
  forceOverwrite?: boolean;
  /** Overwrite ALL env vars, not just sensitive ones (default: false) */
  universalOverwrite?: boolean;
  /** Exit process if secrets file is missing (default: false) */
  exitOnMissing?: boolean;
  /** Multiple paths to search, first existing wins (default: [path]) */
  searchPaths?: string[];
  /** Skip loading if these env vars are already set (default: []) */
  skipIfEnvSet?: string[];
}

function resolveSecretsFilePath(path: string, searchPaths?: string[]): string | null {
  if (searchPaths && searchPaths.length > 0) {
    const envOverride = process.env.SECRETS_PATH?.trim();
    if (envOverride && fs.existsSync(envOverride)) return envOverride;
    return searchPaths.find((p) => fs.existsSync(p)) ?? null;
  }
  return fs.existsSync(path) ? path : null;
}

export function loadSecretsFromFile(
  forceOverwrite = false,
  path = DEFAULT_SECRETS_PATH,
  options?: LoadSecretsOptions,
): void {
  const opts: LoadSecretsOptions = { forceOverwrite, ...options };

  if (opts.skipIfEnvSet?.some((key) => !!process.env[key]?.trim())) return;

  const resolvedPath = resolveSecretsFilePath(path, opts.searchPaths);

  if (!resolvedPath) {
    if (opts.exitOnMissing && process.env.NODE_ENV !== "test") {
      console.error(
        `Secrets file not found: ${path}${opts.searchPaths ? ` (searched: ${opts.searchPaths.join(", ")})` : ""}. ` +
          "OpenBao agent must render secrets before the process starts. " +
          "Set SECRETS_PATH env var to override the default path.",
      );
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

    if (opts.universalOverwrite) {
      process.env[key] = value;
      continue;
    }

    const isSensitive = SENSITIVE_KEYS.has(key);
    if ((opts.forceOverwrite && isSensitive) || !process.env[key]) {
      process.env[key] = value;
    }
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
