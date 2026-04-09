/**
 * Extrage cod/mesaj din erori postgres.js / driver (inclusiv `cause` înlănțuit).
 */
export function getPostgresErrorFields(err: unknown): { code: string; message: string } {
  const obj = err && typeof err === "object" ? err : null;
  const cause =
    obj && "cause" in obj && obj.cause && typeof obj.cause === "object"
      ? (obj.cause as { code?: unknown; message?: unknown })
      : null;
  const codeRaw = cause?.code ?? (obj && "code" in obj ? (obj as { code: unknown }).code : "");
  const messageRaw =
    cause?.message ?? (obj && "message" in obj ? (obj as { message: unknown }).message : "");
  return {
    code: typeof codeRaw === "string" ? codeRaw : String(codeRaw ?? ""),
    message: typeof messageRaw === "string" ? messageRaw : String(messageRaw ?? ""),
  };
}
