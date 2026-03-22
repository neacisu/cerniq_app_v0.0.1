import { sql } from "drizzle-orm";

/**
 * SQL condition: checks that jsonb metadata column contains a specific batchId.
 * Extracts `metadata->'batchId'` and compares to the given value.
 */
export function batchIdMetadataEquals(metadataColumn: unknown, batchId: string) {
  return sql`COALESCE(jsonb_extract_path_text(${metadataColumn}, ${"batchId"}), ${""}) = ${batchId}`;
}

/**
 * SQL condition: checks that a bronze contact's metadata marks it as a failed reprocess.
 * Extracts `metadata->'identityReprocessError'->'status'` and compares to 'failed'.
 */
export function failedReprocessContactEquals(metadataColumn: unknown) {
  return sql`COALESCE(jsonb_extract_path_text(${metadataColumn}, 'identityReprocessError', 'status'), '') = 'failed'`;
}
