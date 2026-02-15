#!/usr/bin/env node
/**
 * CERNIQ.APP — BullMQ Prefix Smoke Test (shared Redis)
 *
 * Purpose:
 * - Ensure BullMQ keys are namespaced under BULLMQ_PREFIX (e.g. "cerniq")
 * - Avoid key collisions when Redis is shared across projects
 *
 * Requirements:
 * - REDIS_URL set (e.g. from OpenBao rendered /secrets/*.env)
 * - BULLMQ_PREFIX set to "cerniq" (no trailing ":")
 *
 * Notes:
 * - This script uses KEYS patterns for validation, which is NOT for production.
 */

import { Queue } from 'bullmq';
import IORedis from 'ioredis';

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function normalizeBullmqPrefix(raw) {
  // BullMQ adds its own ":" separators, so we keep prefix without trailing ":".
  return raw.replace(/:+$/g, '');
}

const redisUrl = requiredEnv('REDIS_URL');
const bullmqPrefix = normalizeBullmqPrefix(
  process.env.BULLMQ_PREFIX || process.env.REDIS_PREFIX || 'cerniq:',
);
const queueName = process.env.BULLMQ_QUEUE_NAME || 'smoke:bullmq-prefix';

const redis = new IORedis(redisUrl, {
  // BullMQ handles retries; keep this simple for a smoke test.
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
});

const queue = new Queue(queueName, {
  connection: redis,
  prefix: bullmqPrefix,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
});

try {
  await queue.add('ping', { t: Date.now() });

  // Validate that BullMQ created keys under the desired prefix.
  const wantedPattern = `${bullmqPrefix}:${queueName}:*`;
  const wantedKeys = await redis.keys(wantedPattern);

  if (wantedKeys.length === 0) {
    throw new Error(
      `No BullMQ keys found for pattern ${wantedPattern} (prefix not applied?)`,
    );
  }

  // Negative check: make sure default "bull" prefix didn't leak for this queue.
  const defaultPattern = `bull:${queueName}:*`;
  const defaultKeys = await redis.keys(defaultPattern);
  if (defaultKeys.length > 0) {
    throw new Error(
      `Found keys with default BullMQ prefix for this queue: ${defaultPattern}`,
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        queueName,
        bullmqPrefix,
        keysMatched: wantedKeys.length,
      },
      null,
      2,
    ),
  );
} finally {
  // Best-effort cleanup; ignore errors if the queue is in use.
  try {
    await queue.obliterate({ force: true });
  } catch {
    // noop
  }
  await queue.close();
  await redis.quit();
}

