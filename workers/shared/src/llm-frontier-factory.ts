/**
 * Lanț frontier Plan §XIII — ordine: xAI → OpenAI → Anthropic → Gemini → DeepSeek.
 * ID-uri model configurabile prin env (default-uri aliniate documentației publice apr. 2026).
 *
 * Nu trimite date `sensitive` — folosiți `dataSensitivity` + `withLlmFallbackChain`.
 */
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const XAI_BASE = (process.env.XAI_BASE_URL ?? "https://api.x.ai/v1").replace(/\/+$/, "");

/** @see https://docs.x.ai/docs/models */
export const DEFAULT_FRONTIER_XAI_MODEL =
  process.env.CERNIQ_FRONTIER_XAI_MODEL?.trim() ?? process.env.XAI_MODEL?.trim() ?? "grok-4";

export const DEFAULT_FRONTIER_OPENAI_CHAT_MODEL =
  process.env.CERNIQ_FRONTIER_OPENAI_CHAT_MODEL?.trim() ?? "gpt-4o";

/** Claude Sonnet (Messages API). */
export const DEFAULT_FRONTIER_ANTHROPIC_MODEL =
  process.env.CERNIQ_FRONTIER_ANTHROPIC_MODEL?.trim() ?? "claude-sonnet-4-20250514";

export const DEFAULT_FRONTIER_GEMINI_MODEL =
  process.env.CERNIQ_FRONTIER_GEMINI_MODEL?.trim() ?? "gemini-2.0-flash";

export const DEFAULT_FRONTIER_DEEPSEEK_MODEL =
  process.env.CERNIQ_FRONTIER_DEEPSEEK_MODEL?.trim() ?? "deepseek-chat";

const DEEPSEEK_BASE = "https://api.deepseek.com";

function geminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_AI_API_KEY?.trim();
}

function messageContentToString(content: ChatCompletionMessageParam["content"]): string {
  if (content === null || content === undefined) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "object" && part && "text" in part && typeof part.text === "string") {
          return part.text;
        }
        return JSON.stringify(part);
      })
      .join("");
  }
  return JSON.stringify(content);
}

/** Agregă system + rest pentru API-uri non-OpenAI (Anthropic / Gemini). */
function flattenChatMessagesForNonOpenAi(messages: ChatCompletionMessageParam[]): {
  system: string;
  userBlock: string;
} {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => messageContentToString(m.content))
    .join("\n\n");
  const userBlock = messages
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role}: ${messageContentToString(m.content)}`)
    .join("\n\n");
  return { system, userBlock };
}

async function geminiGenerateText(
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const key = geminiKey();
  if (!key) throw new Error("GEMINI_API_KEY or GOOGLE_AI_API_KEY is not set");
  const model = DEFAULT_FRONTIER_GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
    }),
  });
  const data = (await res.json()) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  if (!res.ok) throw new Error(data.error?.message ?? `Gemini HTTP ${res.status}`);
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini returned empty content");
  return text;
}

async function anthropicMessagesText(
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: DEFAULT_FRONTIER_ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const data = (await res.json()) as {
    error?: { message?: string };
    content?: Array<{ type?: string; text?: string }>;
  };
  if (!res.ok) throw new Error(data.error?.message ?? `Anthropic HTTP ${res.status}`);
  const block = data.content?.[0];
  if (block?.type === "text" && typeof block.text === "string") return block.text;
  throw new Error("Anthropic returned no text block");
}

export type FrontierChatFactoryOptions = {
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly timeoutMs?: number;
};

/**
 * Pași fallback chat text (OpenAI-compatible messages), în ordinea Plan §XIII.
 * Omite pașii pentru care lipsește cheia API.
 */
export function buildFrontierChatTextFallbackSteps(
  messages: ChatCompletionMessageParam[],
  options: FrontierChatFactoryOptions = {},
): ReadonlyArray<{ readonly name: string; readonly run: () => Promise<string> }> {
  const maxTokens = options.maxTokens ?? 1024;
  const temperature = options.temperature ?? 0.2;
  const timeoutMs = options.timeoutMs ?? 90_000;
  const signal = () => AbortSignal.timeout(timeoutMs);
  const steps: Array<{ name: string; run: () => Promise<string> }> = [];

  const xaiKey = process.env.XAI_API_KEY?.trim();
  if (xaiKey) {
    const client = new OpenAI({
      baseURL: XAI_BASE,
      apiKey: xaiKey,
      timeout: timeoutMs,
      maxRetries: 0,
    });
    const model = DEFAULT_FRONTIER_XAI_MODEL;
    steps.push({
      name: model,
      run: async () => {
        const r = await client.chat.completions.create(
          {
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
          },
          { signal: signal() },
        );
        return r.choices[0]?.message?.content ?? "";
      },
    });
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    const client = new OpenAI({
      apiKey: openaiKey,
      timeout: timeoutMs,
      maxRetries: 0,
    });
    const model = DEFAULT_FRONTIER_OPENAI_CHAT_MODEL;
    steps.push({
      name: model,
      run: async () => {
        const r = await client.chat.completions.create(
          {
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
          },
          { signal: signal() },
        );
        return r.choices[0]?.message?.content ?? "";
      },
    });
  }

  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    const { system: sys, userBlock } = flattenChatMessagesForNonOpenAi(messages);
    steps.push({
      name: DEFAULT_FRONTIER_ANTHROPIC_MODEL,
      run: async () => anthropicMessagesText(sys, userBlock || "{}", maxTokens),
    });
  }

  if (geminiKey()) {
    const { system: sys, userBlock } = flattenChatMessagesForNonOpenAi(messages);
    steps.push({
      name: DEFAULT_FRONTIER_GEMINI_MODEL,
      run: async () => geminiGenerateText(sys, userBlock, maxTokens),
    });
  }

  const dsKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (dsKey) {
    const client = new OpenAI({
      baseURL: DEEPSEEK_BASE,
      apiKey: dsKey,
      timeout: timeoutMs,
      maxRetries: 0,
    });
    const model = DEFAULT_FRONTIER_DEEPSEEK_MODEL;
    steps.push({
      name: model,
      run: async () => {
        const r = await client.chat.completions.create(
          {
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
          },
          { signal: signal() },
        );
        return r.choices[0]?.message?.content ?? "";
      },
    });
  }

  return steps;
}

function stripJsonMarkdown(raw: string): string {
  return raw.replaceAll(/```(?:json)?/gi, "").trim();
}

/**
 * Fallback JSON object (înregistrare cheie-valoare), același ordin ca chat text.
 */
export function buildFrontierStructuredJsonRecordFallbackSteps(
  systemPrompt: string,
  userPrompt: string,
  options: FrontierChatFactoryOptions = {},
): ReadonlyArray<{ readonly name: string; readonly run: () => Promise<Record<string, unknown>> }> {
  const maxTokens = options.maxTokens ?? 3000;
  const temperature = options.temperature ?? 0.1;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const signal = () => AbortSignal.timeout(timeoutMs);
  const steps: Array<{ name: string; run: () => Promise<Record<string, unknown>> }> = [];

  const parse = (raw: string): Record<string, unknown> => {
    const cleaned = stripJsonMarkdown(raw);
    return JSON.parse(cleaned) as Record<string, unknown>;
  };

  const xaiKey = process.env.XAI_API_KEY?.trim();
  if (xaiKey) {
    const client = new OpenAI({
      baseURL: XAI_BASE,
      apiKey: xaiKey,
      timeout: timeoutMs,
      maxRetries: 0,
    });
    const model = DEFAULT_FRONTIER_XAI_MODEL;
    steps.push({
      name: `${model}-json`,
      run: async () => {
        const r = await client.chat.completions.create(
          {
            model,
            temperature,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          },
          { signal: signal() },
        );
        return parse(r.choices[0]?.message?.content ?? "{}");
      },
    });
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    const client = new OpenAI({
      apiKey: openaiKey,
      timeout: timeoutMs,
      maxRetries: 0,
    });
    const model = DEFAULT_FRONTIER_OPENAI_CHAT_MODEL;
    steps.push({
      name: `${model}-json`,
      run: async () => {
        const r = await client.chat.completions.create(
          {
            model,
            temperature,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          },
          { signal: signal() },
        );
        return parse(r.choices[0]?.message?.content ?? "{}");
      },
    });
  }

  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    const u = `${userPrompt}\n\nRăspunde DOAR cu un singur obiect JSON valid, fără markdown.`;
    steps.push({
      name: `${DEFAULT_FRONTIER_ANTHROPIC_MODEL}-json`,
      run: async () => {
        const text = await anthropicMessagesText(systemPrompt, u, maxTokens);
        return parse(text);
      },
    });
  }

  if (geminiKey()) {
    steps.push({
      name: `${DEFAULT_FRONTIER_GEMINI_MODEL}-json`,
      run: async () => {
        const text = await geminiGenerateText(
          `${systemPrompt}\nRăspunde DOAR cu JSON valid.`,
          userPrompt,
          maxTokens,
        );
        return parse(text);
      },
    });
  }

  const dsKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (dsKey) {
    const client = new OpenAI({
      baseURL: DEEPSEEK_BASE,
      apiKey: dsKey,
      timeout: timeoutMs,
      maxRetries: 0,
    });
    const model = DEFAULT_FRONTIER_DEEPSEEK_MODEL;
    steps.push({
      name: `${model}-json`,
      run: async () => {
        const r = await client.chat.completions.create(
          {
            model,
            temperature,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          },
          { signal: signal() },
        );
        return parse(r.choices[0]?.message?.content ?? "{}");
      },
    });
  }

  return steps;
}
