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
  exitOnMissing?: boolean;
  /**
   * When true, overwrites ALL env keys from the secrets file — not just SENSITIVE_KEYS.
   * Use for full SIGHUP reloads where non-sensitive config values may also have changed.
   */
  universalOverwrite?: boolean;
  searchPaths?: string[];
}

function resolveSecretsFilePath(path: string, searchPaths?: string[]): string | null {
  if (searchPaths?.length) {
    const envOverride = process.env.SECRETS_PATH;
    if (envOverride && fs.existsSync(envOverride)) return envOverride;
    return searchPaths.find((p) => fs.existsSync(p)) ?? null;
  }
  return fs.existsSync(path) ? path : null;
}

function applyEnvLine(line: string, forceOverwrite: boolean, universalOverwrite = false): void {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const eq = trimmed.indexOf("=");
  if (eq < 0) return;

  const key = trimmed.slice(0, eq).trim();
  const value = trimmed.slice(eq + 1).trim();

  if (universalOverwrite || (forceOverwrite && SENSITIVE_KEYS.has(key))) {
    process.env[key] = value;
    return;
  }
  if (!process.env[key]) process.env[key] = value;
}

export function loadSecretsFromFile(
  forceOverwrite = false,
  path = DEFAULT_SECRETS_PATH,
  options?: LoadSecretsOptions,
): void {
  const { exitOnMissing = false, universalOverwrite = false, searchPaths } = options ?? {};
  const resolvedPath = resolveSecretsFilePath(path, searchPaths);

  if (!resolvedPath) {
    if (exitOnMissing && process.env.NODE_ENV !== "test") {
      const searched = searchPaths ? searchPaths.join(", ") : path;
      console.error(`Secrets file not found: ${searched}`);
      console.error("Ensure OpenBao agent has rendered secrets before the service starts.");
      process.exit(1);
    }
    return;
  }

  const content = fs.readFileSync(resolvedPath, "utf-8");
  for (const line of content.split("\n")) {
    applyEnvLine(line, forceOverwrite, universalOverwrite);
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
