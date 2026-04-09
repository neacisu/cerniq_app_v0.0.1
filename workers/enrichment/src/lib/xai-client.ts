import { callExternalApi } from "@cerniq/worker-shared";

const XAI_BASE_URL = process.env.XAI_BASE_URL ?? "https://api.x.ai/v1";
const XAI_API_KEY = process.env.XAI_API_KEY ?? "";
const XAI_MODEL = process.env.XAI_MODEL ?? "grok-beta";
/** Aliniat la `PROVIDER_BREAKER_OPTIONS.xai` (30s); suprascrie cu `XAI_TIMEOUT_MS` dacă e nevoie. */
const XAI_TIMEOUT_MS = Number(process.env.XAI_TIMEOUT_MS ?? "30000");

async function callXaiJson(
  systemPrompt: string,
  userPrompt: string,
): Promise<Record<string, unknown>> {
  if (!XAI_API_KEY) throw new Error("Missing XAI_API_KEY");
  const response = await fetch(`${XAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${XAI_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(XAI_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`xAI API error: ${response.status}`);
  }
  const payload = (await response.json()) as Record<string, unknown>;
  const choices = Array.isArray(payload.choices)
    ? (payload.choices as Array<Record<string, unknown>>)
    : [];
  const message =
    choices[0] &&
    typeof choices[0] === "object" &&
    choices[0].message &&
    typeof choices[0].message === "object"
      ? (choices[0].message as Record<string, unknown>)
      : null;
  const content = message && typeof message.content === "string" ? message.content : "{}";
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error(`xAI returned invalid JSON: ${content.slice(0, 200)}`);
  }
}

export async function xaiStructuredJson(
  systemPrompt: string,
  userPrompt: string,
): Promise<Record<string, unknown>> {
  return callExternalApi("xai", () => callXaiJson(systemPrompt, userPrompt));
}
