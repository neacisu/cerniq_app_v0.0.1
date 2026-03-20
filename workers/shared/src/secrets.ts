import fs from "node:fs";

const DEFAULT_SECRETS_PATH = "/secrets/workers.env";
const SENSITIVE_KEYS = new Set([
  "DATABASE_URL",
  "REDIS_URL",
  "REDIS_PASSWORD",
  "REDIS_PREFIX",
  "BULLMQ_PREFIX",
]);
const OPENBAO_READY_MARKER = "OPENBAO_SECRETS_LOADED=true";

export function loadSecretsFromFile(forceOverwrite = false, path = DEFAULT_SECRETS_PATH): void {
  if (!fs.existsSync(path)) return;

  const content = fs.readFileSync(path, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    const isSensitive = SENSITIVE_KEYS.has(key);

    if (forceOverwrite && isSensitive) {
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
