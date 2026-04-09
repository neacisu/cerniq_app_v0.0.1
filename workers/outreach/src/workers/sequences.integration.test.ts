/**
 * Contract integrare secvențe — fabrici exportate (logica detaliată: sequences.test.ts).
 */
import { describe, it, expect } from "vitest";
import {
  createSequenceSchedulerWorker,
  createSequenceStopWorker,
  createSequenceAdvanceWorker,
  createEnrollmentManagerWorker,
} from "./sequences.js";

describe("sequences integration (export factories)", () => {
  it("exportă toți workerii de secvență documentați în sequences.ts", () => {
    expect(typeof createSequenceSchedulerWorker).toBe("function");
    expect(typeof createSequenceStopWorker).toBe("function");
    expect(typeof createSequenceAdvanceWorker).toBe("function");
    expect(typeof createEnrollmentManagerWorker).toBe("function");
  });
});
