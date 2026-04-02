/**
 * OpenBao credential injection helpers for the Drizzle migration CLI.
 *
 * OpenBao agent writes a secrets file (e.g. /opt/cerniq/runtime-secrets/api/api.env)
 * with a `OPENBAO_SECRETS_LOADED=true` readiness marker. This module:
 *   1. Locates the file (explicit path → known bind-mount paths).
 *   2. Waits for the readiness marker (handles cold-start race conditions).
 *   3. Applies secrets as the AUTHORITATIVE source (overrides env vars).
 *
 * This ensures migrations always use the credentials issued by OpenBao,
 * not stale values manually exported in the shell session.
 *
 * ADR-0033 — OpenBao Secrets Management.
 */
import { readFileSync, existsSync } from "node:fs";

// ── Constants ─────────────────────────────────────────────────────────────────

export const OPENBAO_READY_MARKER = "OPENBAO_SECRETS_LOADED=true";
export const OPENBAO_READY_TIMEOUT_MS_DEFAULT = 30_000;
export const OPENBAO_POLL_INTERVAL_MS = 500;

export const SECRETS_SEARCH_PATHS = [
  "/opt/cerniq/runtime-secrets/api/api.env",
  "/secrets/api.env",
] as const;

// ── File helpers ───────────────────────────────────────────────────────────────

/**
 * Resolve the secrets file path:
 *   1. SECRETS_PATH env var (explicit override)
 *   2. First existing path from SECRETS_SEARCH_PATHS
 * Returns null if none found.
 */
export function findSecretsFilePath(
  secretsPathEnv: string | undefined = process.env.SECRETS_PATH,
): string | null {
  const explicit = secretsPathEnv?.trim();
  if (explicit) return existsSync(explicit) ? explicit : null;
  return SECRETS_SEARCH_PATHS.find((p) => existsSync(p)) ?? null;
}

/**
 * Check whether OpenBao agent has finished writing the secrets file.
 * The readiness marker `OPENBAO_SECRETS_LOADED=true` is written by the
 * OpenBao agent template as the last line, ensuring all secrets are present.
 */
export function isSecretsFileReady(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  try {
    return readFileSync(filePath, "utf8").includes(OPENBAO_READY_MARKER);
  } catch {
    return false;
  }
}

/**
 * Poll until `OPENBAO_SECRETS_LOADED=true` appears in the file,
 * or until `timeoutMs` elapses. Returns true when ready, false on timeout.
 *
 * @param sleepFn — injectable sleep function for testing
 */
export async function waitForOpenBaoReady(
  filePath: string,
  timeoutMs: number,
  sleepFn: (ms: number) => Promise<void> = (ms) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (isSecretsFileReady(filePath)) return true;
    await sleepFn(OPENBAO_POLL_INTERVAL_MS);
  }
  return false;
}

/**
 * Parse KEY=VALUE lines from a secrets file and apply them to `env`.
 * Skips comment lines and empty lines.
 *
 * @param forceOverwrite — when true, overwrites existing keys (OpenBao authoritative)
 * @param env — injectable env object for testing (defaults to process.env)
 */
export function applySecretsFile(
  filePath: string,
  forceOverwrite: boolean,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const lines = readFileSync(filePath, "utf8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx < 1) continue;
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim();
    if (!key) continue;
    if (forceOverwrite || !(key in env)) {
      env[key] = val;
    }
  }
}

// ── Public interface ───────────────────────────────────────────────────────────

export interface LoadMigrationCredentialsOptions {
  /** Injectable env object for testing (defaults to process.env). */
  env?: NodeJS.ProcessEnv;
  /** Injectable sleep function for testing. */
  sleepFn?: (ms: number) => Promise<void>;
  /** Explicit secrets file path (overrides SECRETS_PATH env var). */
  secretsPath?: string;
}

/**
 * Load database credentials for the migration CLI.
 *
 * Resolution order:
 *   1. OPENBAO_SKIP=true → use env vars directly (local dev bypass)
 *   2. OpenBao secrets file (when OPENBAO_SECRETS_LOADED=true is present)
 *      → applied as authoritative source (overrides existing env vars)
 *   3. No file found → fall back to DATABASE_DIRECT_URL / DATABASE_URL env vars
 *
 * Throws if no credentials are available after all sources are exhausted.
 */
export async function loadMigrationCredentials(
  opts: LoadMigrationCredentialsOptions = {},
): Promise<{ source: "openbao" | "env" | "fallback"; filePath?: string }> {
  const env = opts.env ?? process.env;
  const sleepFn = opts.sleepFn;

  // ── 1. Local dev / test bypass ──────────────────────────────────────────────
  if (env.OPENBAO_SKIP === "true") {
    if (!env.DATABASE_DIRECT_URL && !env.DATABASE_URL) {
      throw new Error(
        "OPENBAO_SKIP=true but neither DATABASE_DIRECT_URL nor DATABASE_URL is set.\n" +
          "  Set one of these env vars for local development.",
      );
    }
    return { source: "env" };
  }

  // ── 2. Locate OpenBao secrets file ──────────────────────────────────────────
  // opts.secretsPath is an explicit override (used in tests); it goes through
  // findSecretsFilePath so a non-existent path correctly falls back to env vars.
  const filePath = findSecretsFilePath(opts.secretsPath ?? env.SECRETS_PATH);

  if (!filePath) {
    // No file found — fall back to env vars
    const searched = [env.SECRETS_PATH, ...SECRETS_SEARCH_PATHS].filter(Boolean).join(", ");
    console.warn(
      `[migrate] No OpenBao secrets file found. Falling back to env vars.\n` +
        `  Searched: ${searched}\n` +
        "  Set OPENBAO_SKIP=true to suppress this warning in local dev.",
    );
    if (!env.DATABASE_DIRECT_URL && !env.DATABASE_URL) {
      throw new Error(
        "No OpenBao secrets file and no DATABASE_DIRECT_URL / DATABASE_URL env var.\n" +
          "  Ensure OpenBao agent has rendered secrets before running migrations.\n" +
          `  Expected file paths: ${SECRETS_SEARCH_PATHS.join(", ")}`,
      );
    }
    return { source: "fallback" };
  }

  // ── 3. Wait for OpenBao readiness ───────────────────────────────────────────
  const timeoutMs = Number(env.OPENBAO_READY_TIMEOUT_MS ?? OPENBAO_READY_TIMEOUT_MS_DEFAULT);

  if (!isSecretsFileReady(filePath)) {
    console.log(`[migrate] Waiting up to ${timeoutMs}ms for OpenBao readiness: ${filePath}`);
    const ready = await waitForOpenBaoReady(filePath, timeoutMs, sleepFn);
    if (!ready) {
      throw new Error(
        `[migrate] OpenBao secrets file not ready after ${timeoutMs}ms: ${filePath}\n` +
          "  Ensure OpenBao agent template has rendered and written OPENBAO_SECRETS_LOADED=true.\n" +
          "  Increase OPENBAO_READY_TIMEOUT_MS if agent startup is slow.",
      );
    }
  }

  // ── 4. Apply OpenBao secrets (authoritative — overrides env vars) ───────────
  applySecretsFile(filePath, true, env);

  if (!env.DATABASE_DIRECT_URL && !env.DATABASE_URL) {
    throw new Error(
      `[migrate] OpenBao secrets file is ready but contains no DATABASE_DIRECT_URL or DATABASE_URL.\n` +
        `  File: ${filePath}\n` +
        "  Check the OpenBao template — ensure it renders the database credential keys.",
    );
  }

  return { source: "openbao", filePath };
}
