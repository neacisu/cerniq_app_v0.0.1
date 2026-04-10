import { createServiceLogger } from "@cerniq/observability";
import { callExternalApi } from "@cerniq/worker-shared";

const XAI_BASE_URL = process.env.XAI_BASE_URL ?? "https://api.x.ai/v1";
const XAI_API_KEY = process.env.XAI_API_KEY ?? "";
const XAI_MODEL = process.env.XAI_MODEL ?? "grok-beta";
/** Aliniat la `PROVIDER_BREAKER_OPTIONS.xai` (30s); suprascrie cu `XAI_TIMEOUT_MS` dacă e nevoie. */
const XAI_TIMEOUT_MS = Number(process.env.XAI_TIMEOUT_MS ?? "30000");

const log = createServiceLogger("xai-api", { etapa: "e1" });

const CHAT_COMPLETIONS_PATH = "/chat/completions";

function errorTypeName(err: unknown): string {
  if (err instanceof Error) return err.constructor?.name ?? "Error";
  return typeof err;
}

function readUsageTokens(payload: Record<string, unknown>): {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
} {
  const usage = payload.usage;
  if (!usage || typeof usage !== "object") return {};
  const u = usage as Record<string, unknown>;
  const promptTokens = typeof u.prompt_tokens === "number" ? u.prompt_tokens : undefined;
  const completionTokens =
    typeof u.completion_tokens === "number" ? u.completion_tokens : undefined;
  const totalTokens = typeof u.total_tokens === "number" ? u.total_tokens : undefined;
  return { promptTokens, completionTokens, totalTokens };
}

function assertXaiApiKeyConfigured(): void {
  if (!XAI_API_KEY) {
    log.error({ event: "xai_request_error", reason: "missing_api_key", model: XAI_MODEL });
    throw new Error("Missing XAI_API_KEY");
  }
}

async function xaiFetchChatCompletion(
  systemPrompt: string,
  userPrompt: string,
  latencyMs: () => number,
): Promise<Response> {
  try {
    return await fetch(`${XAI_BASE_URL}${CHAT_COMPLETIONS_PATH}`, {
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({
      event: "xai_request_error",
      phase: "network",
      latencyMs: latencyMs(),
      model: XAI_MODEL,
      endpointPath: CHAT_COMPLETIONS_PATH,
      errorMessage: msg,
      errorType: errorTypeName(err),
      err,
    });
    throw new Error(`xAI API [network]: ${msg}`, { cause: err });
  }
}

async function logAndThrowXaiHttpError(
  response: Response,
  statusCode: number,
  latencyMs: () => number,
): Promise<never> {
  let bodySnippet = "";
  try {
    bodySnippet = (await response.text()).slice(0, 200);
  } catch {
    /* ignore */
  }
  const msg = bodySnippet || `HTTP ${statusCode}`;
  log.error({
    event: "xai_http_error",
    latencyMs: latencyMs(),
    httpStatus: statusCode,
    model: XAI_MODEL,
    endpointPath: CHAT_COMPLETIONS_PATH,
    errorMessage: msg,
  });
  throw new Error(`xAI API error: ${statusCode}: ${msg}`, {
    cause: new Error(`xAI HTTP ${statusCode}: ${msg}`),
  });
}

async function xaiParseResponsePayload(
  response: Response,
  statusCode: number,
  latencyMs: () => number,
): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({
      event: "xai_request_error",
      phase: "json_parse_response",
      latencyMs: latencyMs(),
      httpStatus: statusCode,
      model: XAI_MODEL,
      endpointPath: CHAT_COMPLETIONS_PATH,
      errorMessage: msg,
      errorType: errorTypeName(err),
      err,
    });
    throw new Error(`xAI API [${statusCode}]: invalid response JSON`, { cause: err });
  }
}

function xaiExtractMessageContentString(payload: Record<string, unknown>): string {
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
  return message && typeof message.content === "string" ? message.content : "{}";
}

function parseAndLogXaiStructuredContent(
  content: string,
  statusCode: number,
  latencyMs: number,
  usage: ReturnType<typeof readUsageTokens>,
): Record<string, unknown> {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    log.info({
      event: "xai_request_success",
      latencyMs,
      statusCode,
      model: XAI_MODEL,
      endpointPath: CHAT_COMPLETIONS_PATH,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
    });
    return parsed;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({
      event: "xai_request_error",
      phase: "content_json_parse",
      latencyMs,
      httpStatus: statusCode,
      model: XAI_MODEL,
      endpointPath: CHAT_COMPLETIONS_PATH,
      contentSnippet: content.slice(0, 200),
      errorMessage: msg,
      errorType: errorTypeName(err),
      err,
    });
    throw new Error(`xAI returned invalid JSON: ${content.slice(0, 200)}`, { cause: err });
  }
}

async function callXaiJson(
  systemPrompt: string,
  userPrompt: string,
): Promise<Record<string, unknown>> {
  assertXaiApiKeyConfigured();

  log.info({
    event: "xai_request_start",
    model: XAI_MODEL,
    endpointPath: CHAT_COMPLETIONS_PATH,
  });

  const t0 = performance.now();
  const latencyMs = () => Math.round(performance.now() - t0);

  const response = await xaiFetchChatCompletion(systemPrompt, userPrompt, latencyMs);
  const statusCode = response.status;

  if (!response.ok) {
    return logAndThrowXaiHttpError(response, statusCode, latencyMs);
  }

  const payload = await xaiParseResponsePayload(response, statusCode, latencyMs);
  const usage = readUsageTokens(payload);
  const content = xaiExtractMessageContentString(payload);
  return parseAndLogXaiStructuredContent(content, statusCode, latencyMs(), usage);
}

export async function xaiStructuredJson(
  systemPrompt: string,
  userPrompt: string,
): Promise<Record<string, unknown>> {
  return callExternalApi("xai", () => callXaiJson(systemPrompt, userPrompt));
}
