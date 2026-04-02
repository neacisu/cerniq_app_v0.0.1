/**
 * K63 — objection:detect (concurrency:10, timeout:10s)
 *
 * Detectează obiecțiile clientului dintr-un mesaj de negociere.
 * Folosește fastClient Qwen2.5-14B — task simplu, NU reasoning (§XIII L2599).
 *
 * Obiecții exacte din plan (ZERO inventii extra):
 *   PRET_PREA_MARE | COMPETITOR_MAI_BUN | NU_AM_BUGET | NU_E_MOMENTUL | NU_AM_NEVOIE
 *
 * Output include suggestedResponse (răspuns recomandat în română).
 * Output Zod-validated OBLIGATORIU.
 * FAZA 7l — Plan L1903.
 */
import type { Processor } from "bullmq";
import { z } from "zod";
import { setSessionTenantId } from "@cerniq/db";
import { fastChat } from "../lib/llm-client.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export const OBJECTION_TYPES = [
  "PRET_PREA_MARE",
  "COMPETITOR_MAI_BUN",
  "NU_AM_BUGET",
  "NU_E_MOMENTUL",
  "NU_AM_NEVOIE",
] as const;

export type ObjectionType = (typeof OBJECTION_TYPES)[number];

export interface ObjectionDetectJobData {
  tenantId: string;
  negotiationId: string;
  messageId?: string;
  content: string;
  /** Contextul negocierii (produs, valoare), folosit pentru suggestedResponse. */
  productContext?: string;
}

export interface ObjectionDetectResult {
  ok: boolean;
  hasObjection: boolean;
  objectionType: ObjectionType | null;
  severity: "LOW" | "MEDIUM" | "HIGH";
  suggestedResponse: string | null;
}

// ── Zod Schema ─────────────────────────────────────────────────────────────────

const OBJECTION_TYPES_WITH_NULL = [...OBJECTION_TYPES] as const;

const ObjectionSchema = z.object({
  hasObjection: z.boolean(),
  objectionType: z.enum(OBJECTION_TYPES_WITH_NULL).nullable(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  suggestedResponse: z.string().nullable(),
});

// ── System Prompt ─────────────────────────────────────────────────────────────

const OBJECTIONS_LIST = OBJECTION_TYPES.join(" | ");

const SYSTEM_PROMPT = `Ești un detector de obiecții pentru mesaje B2B de vânzări în română/engleză.
Analizează mesajul și returnează EXCLUSIV JSON valid cu structura exactă:
{
  "hasObjection": true | false,
  "objectionType": "<una din obiecțiile de mai jos sau null>",
  "severity": "LOW" | "MEDIUM" | "HIGH",
  "suggestedResponse": "<răspuns recomandat în română sau null>"
}
Tipuri de obiecții permise (STRICT, fără alte valori):
${OBJECTIONS_LIST}
Definiții:
- PRET_PREA_MARE: clientul consideră prețul prea ridicat
- COMPETITOR_MAI_BUN: clientul menționează o ofertă mai bună de la competitor
- NU_AM_BUGET: clientul nu are buget disponibil acum
- NU_E_MOMENTUL: clientul nu este pregătit să cumpere acum
- NU_AM_NEVOIE: clientul nu vede nevoia produsului
Reguli severity:
- HIGH: obiecție blocantă, risc mare de pierdere client
- MEDIUM: obiecție serioasă, necesită adresare imediată
- LOW: obiecție minoră, ușor de gestionat
Dacă nu există obiecție: hasObjection=false, objectionType=null, severity="LOW", suggestedResponse=null
NU adăuga text suplimentar în afara JSON-ului.`;

// ── Processor ─────────────────────────────────────────────────────────────────

const LOG = "[k63:objection:detect]";

export const objectionDetectProcessor: Processor<
  ObjectionDetectJobData,
  ObjectionDetectResult
> = async (job) => {
  const { tenantId, negotiationId, content, productContext } = job.data;

  await setSessionTenantId(tenantId);

  console.info(`${LOG} tenantId=${tenantId} negotiationId=${negotiationId} len=${content.length}`);

  const userMessage = productContext
    ? `Mesaj client: "${content.slice(0, 600)}"\nContext produs: ${productContext.slice(0, 200)}`
    : content.slice(0, 800);

  const raw = await fastChat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    10_000,
  );

  const cleaned = raw.replaceAll(/```(?:json)?/gi, "").trim();
  const parsed = ObjectionSchema.parse(JSON.parse(cleaned));

  console.info(
    `${LOG} hasObjection=${parsed.hasObjection} type=${parsed.objectionType ?? "none"} severity=${parsed.severity} negotiationId=${negotiationId}`,
  );

  return {
    ok: true,
    hasObjection: parsed.hasObjection,
    objectionType: parsed.objectionType,
    severity: parsed.severity,
    suggestedResponse: parsed.suggestedResponse,
  };
};
