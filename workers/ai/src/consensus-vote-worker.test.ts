/**
 * Smoke: modulul se încarcă (rezolvare `@cerniq/db` + `@cerniq/worker-shared`) și exportă fabricile pipeline.
 */
import { describe, it, expect } from "vitest";
import {
  createConsensusVoteCollectWorker,
  createConsensusVoteDecideWorker,
  createConsensusVoteRequestWorker,
} from "./consensus-vote-worker.js";

describe("consensus-vote-worker", () => {
  it("exportă fabrici pentru cele 3 faze (request → collect → decide)", () => {
    expect(typeof createConsensusVoteRequestWorker).toBe("function");
    expect(typeof createConsensusVoteCollectWorker).toBe("function");
    expect(typeof createConsensusVoteDecideWorker).toBe("function");
  });
});
