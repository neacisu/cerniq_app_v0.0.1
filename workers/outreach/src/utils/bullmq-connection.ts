/**
 * Graniță tipată între `ioredis` și BullMQ `ConnectionOptions`.
 *
 * BullMQ folosește `import type * as IORedis from "ioredis"` în `.d.ts`; TypeScript poate
 * lega un `IORedis.Redis` din alt closure npm decât instanța `Redis` a workerului → TS2322.
 * `pnpm.overrides.ioredis` reduce duplicatele; cast-ul rămâne punctul unic de adaptare.
 */
import type { ConnectionOptions } from "bullmq";
import type { Redis } from "ioredis";

export function asBullmqConnection(redis: Redis): ConnectionOptions {
  return redis as unknown as ConnectionOptions;
}
