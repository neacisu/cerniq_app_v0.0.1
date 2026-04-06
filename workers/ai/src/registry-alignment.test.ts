/**
 * Legătură cu `/api/admin` + monitoring: numele de cozi trebuie să treacă `isKnownQueueName`
 * (vezi `apps/api/src/routes/admin-monitoring.ts`). Worker-ul AI este health-only; cozile `ai:*`
 * sunt procesate de enrichment/outreach — aici validăm registry-ul shared.
 */
import { describe, it, expect } from "vitest";
import { isKnownQueueName, queueRegistry } from "@cerniq/worker-shared";

describe("worker-ai — aliniere queue-registry (admin guard)", () => {
  it("fiecare coadă cu prefix ai: este cunoscută în registry (isKnownQueueName)", () => {
    const aiQueues = queueRegistry.map((q) => q.name).filter((n) => n.startsWith("ai:"));
    expect(aiQueues.length).toBeGreaterThan(0);
    for (const name of aiQueues) {
      expect(isKnownQueueName(name), name).toBe(true);
    }
  });
});
