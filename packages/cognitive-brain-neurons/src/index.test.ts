import { describe, expect, it } from "vitest";
import {
  bronzeIngestCsvParserManifest,
  NORMALIZATION_WORKER_BY_QUEUE,
  resolveNormalizerWorkerName,
} from "./index.js";

describe("@cerniq/cognitive-brain-neurons", () => {
  it("manifest matches catalog node key", () => {
    expect(bronzeIngestCsvParserManifest.nodeKey).toBe("e1:ingest:csv");
  });

  it("re-exports normalization worker map from e1-ingest-core", () => {
    expect(NORMALIZATION_WORKER_BY_QUEUE.get("normalize:name")).toBe("B1:name-normalizer");
    expect(resolveNormalizerWorkerName("normalize:email")).toBe("B2:email-normalizer");
  });
});
