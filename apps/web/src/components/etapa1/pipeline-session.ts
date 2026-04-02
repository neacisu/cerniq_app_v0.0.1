export function resolveEffectiveSessionId(
  batchId: string,
  selectedSessionIdsByBatch: Record<string, string>,
  defaultSessionId: string | null | undefined,
): string | undefined {
  return selectedSessionIdsByBatch[batchId] || defaultSessionId || undefined;
}
