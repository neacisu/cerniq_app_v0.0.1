import { describe, expect, it } from "vitest";
import { BRONZE_CSV_INGEST_NODE_KEY } from "./index.js";

describe("@cerniq/cognitive-brain", () => {
  it("exports stable node key for CSV ingest", () => {
    expect(BRONZE_CSV_INGEST_NODE_KEY).toBe("e1:ingest:csv");
  });
});
