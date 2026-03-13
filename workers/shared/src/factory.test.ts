import { describe, expect, it } from "vitest";
import { toBullMqQueueName } from "./factory.js";

describe("queue factory", () => {
  it("maps canonical logical queue names to BullMQ-safe physical names", () => {
    expect(toBullMqQueueName("pipeline:promote:bronze-silver")).toBe(
      "pipeline__promote__bronze-silver",
    );
    expect(toBullMqQueueName("ingest:excel")).toBe("ingest__excel");
  });

  it("leaves already safe queue names unchanged", () => {
    expect(toBullMqQueueName("default")).toBe("default");
    expect(toBullMqQueueName("quality-rollup")).toBe("quality-rollup");
  });
});
