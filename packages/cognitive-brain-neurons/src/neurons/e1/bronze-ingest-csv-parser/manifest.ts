import { BRONZE_CSV_INGEST_NODE_KEY } from "@cerniq/cognitive-brain";

export const bronzeIngestCsvParserManifest = {
  nodeKey: BRONZE_CSV_INGEST_NODE_KEY,
  v2Queue: "bronze:ingest:csv-parser",
  bullmqQueue: "ingest:csv",
} as const;
