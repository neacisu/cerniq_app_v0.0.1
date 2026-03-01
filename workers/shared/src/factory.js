import { Worker } from "bullmq";
import { getQueuePrefix, getRedisConnectionOptions } from "./redis.js";
import { jobDurationSeconds, jobsFailedTotal, jobsProcessedTotal } from "./metrics.js";
export function createWorker(name, processor, options) {
    const worker = new Worker(name, processor, {
        connection: getRedisConnectionOptions(),
        prefix: getQueuePrefix(),
        concurrency: 5,
        ...options,
    });
    worker.on("completed", () => jobsProcessedTotal.inc({ queue: name }));
    worker.on("failed", () => jobsFailedTotal.inc({ queue: name }));
    return {
        worker,
        observeDuration(startMs) {
            jobDurationSeconds.observe({ queue: name }, (Date.now() - startMs) / 1000);
        },
    };
}
