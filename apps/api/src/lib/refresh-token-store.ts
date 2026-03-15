import { randomUUID, createHash } from "node:crypto";
import Redis from "ioredis";
import { envConfig } from "../config.js";

function getKeyPrefix() {
  return envConfig.REDIS_PREFIX ?? "cerniq";
}

function getRefreshTokenPrefix() {
  return `${getKeyPrefix()}:auth:refresh`;
}

function getRefreshFamilyRevokedPrefix() {
  return `${getKeyPrefix()}:auth:refresh:family:revoked`;
}

function createRedisClient() {
  const client = new Redis(envConfig.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 200, 10000),
  });
  client.on("error", () => {
    // Errors handled per-command via rejected promises; suppress unhandled event.
  });
  return client;
}

let redis = createRedisClient();

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function refreshKey(jti: string) {
  return `${getRefreshTokenPrefix()}:${jti}`;
}

function familyRevokedKey(familyId: string) {
  return `${getRefreshFamilyRevokedPrefix()}:${familyId}`;
}

export async function refreshRedisClient() {
  try {
    await redis.quit();
  } catch {
    // If quit fails (disconnected socket), replace client anyway.
  }
  redis = createRedisClient();
}

export async function closeRedisClient() {
  try {
    await redis.quit();
  } catch {
    // Ignore shutdown errors on process exit.
  }
}

export async function storeRefreshToken(args: {
  jti: string;
  familyId: string;
  userId: string;
  tenantId: string;
  token: string;
  expiresInSeconds: number;
}) {
  await redis.set(
    refreshKey(args.jti),
    JSON.stringify({
      familyId: args.familyId,
      userId: args.userId,
      tenantId: args.tenantId,
      tokenHash: hashToken(args.token),
    }),
    "EX",
    args.expiresInSeconds,
  );
}

export async function consumeRefreshToken(jti: string) {
  const key = refreshKey(jti);
  const raw = await redis.get(key);
  if (!raw) return null;
  await redis.del(key);
  try {
    return JSON.parse(raw) as {
      familyId: string;
      userId: string;
      tenantId: string;
      tokenHash: string;
    };
  } catch {
    return null;
  }
}

export async function verifyRefreshTokenHash(jti: string, token: string) {
  const raw = await redis.get(refreshKey(jti));
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { tokenHash?: string };
    return parsed.tokenHash === hashToken(token);
  } catch {
    return false;
  }
}

export async function revokeRefreshFamily(familyId: string, expiresInSeconds = 60 * 60 * 24 * 30) {
  await redis.set(familyRevokedKey(familyId), "1", "EX", expiresInSeconds);
}

export async function isRefreshFamilyRevoked(familyId: string) {
  const found = await redis.get(familyRevokedKey(familyId));
  return found === "1";
}

export function newTokenIds(existingFamilyId?: string) {
  return {
    jti: randomUUID(),
    familyId: existingFamilyId ?? randomUUID(),
  };
}
