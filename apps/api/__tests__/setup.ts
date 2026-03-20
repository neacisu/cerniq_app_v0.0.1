import { existsSync, readFileSync } from "node:fs";
import { request } from "node:https";
import { resolve } from "node:path";

process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.JWT_SECRET ??= "test-jwt-secret-minimum-32-characters-long";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.LOG_LEVEL = "error";

function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};
  const values: Record<string, string> = {};
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    values[key] = value;
  }
  return values;
}

function fetchOpenBaoJson(url: string, token: string): Promise<Record<string, unknown>> {
  return new Promise((resolvePromise, rejectPromise) => {
    const req = request(
      url,
      {
        method: "GET",
        rejectUnauthorized: false,
        headers: {
          "X-Vault-Token": token,
        },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if ((res.statusCode ?? 500) >= 400) {
            rejectPromise(
              new Error(`OpenBao request failed with status ${res.statusCode}: ${body}`),
            );
            return;
          }
          try {
            resolvePromise(JSON.parse(body) as Record<string, unknown>);
          } catch (error) {
            rejectPromise(error);
          }
        });
      },
    );
    req.on("error", rejectPromise);
    req.end();
  });
}

async function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return;

  const rootEnv = parseEnvFile(resolve(process.cwd(), "..", "..", ".env"));
  const openBaoAddr = (process.env.OPENBAO_ADDR ?? rootEnv.OPENBAO_ADDR ?? "").replace(/\/+$/, "");
  const openBaoToken =
    process.env.OPENBAO_ROOT_TOKEN_ACTIVE ??
    process.env.OPENBAO_ROOT_TOKEN_INITIAL ??
    rootEnv.OPENBAO_ROOT_TOKEN_ACTIVE ??
    rootEnv.OPENBAO_ROOT_TOKEN_INITIAL;
  const pgHost = process.env.PG_HOST ?? rootEnv.PG_HOST ?? "10.0.1.107";

  if (openBaoAddr && openBaoToken) {
    const payload = await fetchOpenBaoJson(
      `${openBaoAddr}/v1/cerniq-db/creds/api-dynamic`,
      openBaoToken,
    );
    const data = (payload.data ?? {}) as { username?: string; password?: string };
    if (data.username && data.password) {
      process.env.DATABASE_URL = `postgresql://${encodeURIComponent(data.username)}:${encodeURIComponent(
        data.password,
      )}@${pgHost}:5432/cerniq`;
      return;
    }
  }

  process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:5432/test";
}

await resolveDatabaseUrl();
