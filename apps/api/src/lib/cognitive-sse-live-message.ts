/** Evaluare mesaje Redis → payload SSE (filtrare tenant/batch, contract wire). */

export const MAX_SSE_BRAIN_PAYLOAD_BYTES = 256 * 1024;

export type CognitiveSseLiveWire = {
  id?: number;
  tenantId: string;
  nodeKey: string;
  eventType: string;
  timestamp: string;
  data: Record<string, unknown>;
};

export type CognitiveSseLiveEval =
  | { ok: true; wire: CognitiveSseLiveWire }
  | { ok: false; reason: string };

/**
 * Validează JSON-ul din Redis pentru fluxul Brain.
 * `tenantId` trebuie să coincidă cu JWT; `queryBatchId` opțional restricționează după `batchId` din mesaj.
 */
export function evaluateCognitiveSseLiveMessage(
  message: string,
  tenantId: string,
  queryBatchId: string | undefined,
  maxBytes: number = MAX_SSE_BRAIN_PAYLOAD_BYTES,
): CognitiveSseLiveEval {
  if (message.length > maxBytes) {
    return { ok: false, reason: "payload_too_large" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(message);
  } catch {
    return { ok: false, reason: "malformed_json" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: "malformed_shape" };
  }
  const o = parsed as Record<string, unknown>;
  const msgTenant = o.tenantId;
  if (typeof msgTenant !== "string" || msgTenant.length === 0) {
    return { ok: false, reason: "legacy_no_tenant" };
  }
  if (msgTenant !== tenantId) {
    return { ok: false, reason: "tenant_mismatch" };
  }
  if (queryBatchId !== undefined && o.batchId !== queryBatchId) {
    return { ok: false, reason: "batch_scope" };
  }
  if (
    typeof o.nodeKey !== "string" ||
    typeof o.eventType !== "string" ||
    typeof o.timestamp !== "string"
  ) {
    return { ok: false, reason: "malformed_shape" };
  }
  const dataRaw = o.data;
  const data =
    typeof dataRaw === "object" && dataRaw !== null && !Array.isArray(dataRaw)
      ? (dataRaw as Record<string, unknown>)
      : {};
  const idRaw = o.id;
  const wire: CognitiveSseLiveWire = {
    ...(typeof idRaw === "number" && Number.isFinite(idRaw) ? { id: idRaw } : {}),
    tenantId: msgTenant,
    nodeKey: o.nodeKey,
    eventType: o.eventType,
    timestamp: o.timestamp,
    data,
  };
  return { ok: true, wire };
}
