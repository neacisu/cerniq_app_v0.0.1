import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getQueuePrefix, getRedisConnectionOptions } from "./redis.js";

describe("getQueuePrefix", () => {
  let prevBull: string | undefined;
  let prevRedis: string | undefined;

  beforeEach(() => {
    prevBull = process.env.BULLMQ_PREFIX;
    prevRedis = process.env.REDIS_PREFIX;
    delete process.env.BULLMQ_PREFIX;
    delete process.env.REDIS_PREFIX;
  });

  afterEach(() => {
    if (prevBull === undefined) delete process.env.BULLMQ_PREFIX;
    else process.env.BULLMQ_PREFIX = prevBull;
    if (prevRedis === undefined) delete process.env.REDIS_PREFIX;
    else process.env.REDIS_PREFIX = prevRedis;
  });

  it("throws when BULLMQ_PREFIX is unset", () => {
    expect(() => getQueuePrefix()).toThrow(/BULLMQ_PREFIX/);
  });

  it("returns trimmed prefix and strips trailing colons", () => {
    process.env.BULLMQ_PREFIX = "  cerniq::  ";
    expect(getQueuePrefix()).toBe("cerniq");
  });

  it("does not fall back to REDIS_PREFIX", () => {
    process.env.REDIS_PREFIX = "legacy";
    expect(() => getQueuePrefix()).toThrow(/BULLMQ_PREFIX/);
  });
});

describe("getRedisConnectionOptions", () => {
  let prev: Record<string, string | undefined>;

  beforeEach(() => {
    prev = {
      REDIS_URL: process.env.REDIS_URL,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      REDIS_DB: process.env.REDIS_DB,
      REDIS_SENTINEL_HOSTS: process.env.REDIS_SENTINEL_HOSTS,
      REDIS_SENTINEL_NAME: process.env.REDIS_SENTINEL_NAME,
      BULLMQ_PREFIX: process.env.BULLMQ_PREFIX,
    };
    process.env.BULLMQ_PREFIX = "cerniq";
    delete process.env.REDIS_SENTINEL_HOSTS;
    delete process.env.REDIS_SENTINEL_NAME;
    delete process.env.REDIS_DB;
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("mod direct: host/port/parolă din REDIS_URL", () => {
    process.env.REDIS_URL = "redis://u:p@redis-single:6379/2";
    const o = getRedisConnectionOptions();
    expect(o).toMatchObject({
      host: "redis-single",
      port: 6379,
      password: "p",
      db: 2,
    });
    expect("sentinels" in o).toBe(false);
  });

  it("mod Sentinel: sentinei + nume master când REDIS_SENTINEL_HOSTS este setat", () => {
    process.env.REDIS_URL = "redis://u:secret@ignored:6379/0";
    process.env.REDIS_PASSWORD = "secret";
    process.env.REDIS_SENTINEL_HOSTS = "cerniq-redis-sentinel:26379,backup:26379";
    process.env.REDIS_SENTINEL_NAME = "cerniq-master";
    const o = getRedisConnectionOptions();
    expect(o).toMatchObject({
      name: "cerniq-master",
      password: "secret",
      db: 0,
    });
    expect("sentinels" in o && Array.isArray((o as { sentinels: unknown }).sentinels)).toBe(true);
    expect((o as { sentinels: { host: string; port: number }[] }).sentinels).toEqual([
      { host: "cerniq-redis-sentinel", port: 26379 },
      { host: "backup", port: 26379 },
    ]);
  });

  it("mod Sentinel: nume master implicit cerniq-master dacă REDIS_SENTINEL_NAME lipsește", () => {
    process.env.REDIS_URL = "redis://:x@h:6379/0";
    process.env.REDIS_SENTINEL_HOSTS = "s1:26379";
    delete process.env.REDIS_SENTINEL_NAME;
    const o = getRedisConnectionOptions();
    expect((o as { name: string }).name).toBe("cerniq-master");
  });

  it("mod Sentinel: host fără port → 26379", () => {
    process.env.REDIS_URL = "redis://:pw@localhost:6379/0";
    process.env.REDIS_SENTINEL_HOSTS = "only-host";
    const o = getRedisConnectionOptions();
    expect((o as { sentinels: { host: string; port: number }[] }).sentinels[0]).toEqual({
      host: "only-host",
      port: 26379,
    });
  });
});
