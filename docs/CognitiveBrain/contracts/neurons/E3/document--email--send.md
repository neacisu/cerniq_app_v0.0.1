<!-- neuron-contract:author-complete -->

# Neuron `document:email:send`

> **Status:** audit manual **2026-04-11**. **I52** trimite email tranzacțional cu **Resend** (nu SendGrid/SMTP din textul catalogului vechi), opțional cu PDF base64 ca atașament.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `document:email:send` |
| etapa | E3 |
| familie (v2) | `fiscal-docs` |
| contract_path | `contracts/neurons/E3/document--email--send.md` |
| ADR familie (indicativ) | [fiscal-docs](../../adr/families/e3/fiscal-docs.md) |

## Scop în context real

**v2** (L4794–4817): **MotorNeuron**, **HIGH**, swimlane **fiscal-execution**, trimitere document fiscal/comercial prin email cu tracking, **Non-AI**; text catalog menționează SendGrid/SMTP. **Repo:** `workers/e3-ai-sales/src/workers/i52-document-email-send.ts` validează destinatar (`EMAIL_REGEX` L23, L53–55), construiește **`Resend`** (L58–60), atașamente din `pdfBase64` → `Buffer` (L63–70), apel `resend.emails.send` (L73–79); erori Resend → throw (L81–83). **Înregistrare:** `main.ts` L236. **Registry:** `QUEUES.E3_DOCUMENT_EMAIL_SEND` (`queue-registry.ts` L299, L999). **Catalog:** `e3:document:email-send` (`cognitive-node-catalog.ts` L1973–1980). **Teste:** `i-workers.test.ts` I52 (L628+). Nu s-a căutat exhaustiv lanțul Oblio→I51→I52 în acest audit; producători `queue.add` pot fi în alți workeri sau API.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`document:email:send\`` (L4794–4817).
- `packages/shared/src/cognitive-node-catalog.ts` — L1973–1980.
- `workers/shared/src/queue-registry.ts` — L299, L999.
- `workers/e3-ai-sales/src/main.ts` — L236.
- `workers/e3-ai-sales/src/workers/i52-document-email-send.ts`.
- `workers/e3-ai-sales/src/__tests__/i-workers.test.ts` — I52.
- `workers/shared/src/factory.ts` — instrumentare worker.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L4813); I52 fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:document:email-send`**, coadă **`document:email:send`** (`cognitive-node-catalog.ts` L1974–1975). `QUEUES.E3_DOCUMENT_EMAIL_SEND` (`queue-registry.ts` L299). | v2: același `Confirmed queue field` (L4811). | — |
| 2 | Etapă, familie, swimlane | E3; **`fiscal-execution`** (`cognitive-node-catalog.ts` L1978). | v2: fiscal-docs, swimlane fiscal-execution (L4804). | — |
| 3 | Rol declarat | Email + HTML + PDF opțional via Resend (`i52` L1–16, L46–94). | v2: SendGrid/SMTP + tracking (L4808–4810). | **Decalaj furnizor:** implementare **Resend**; fără cod SendGrid/SMTP în I52. |
| 4 | NeuronType + SOFAI | **`MotorNeuron`** (`cognitive-node-catalog.ts` L1977). | v2: MotorNeuron (L4802). | — |
| 5 | Criticitate | **`HIGH`** (`cognitive-node-catalog.ts` L1980). | v2: HIGH (L4805). | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan` via `createWorker` (`factory.ts`). | v2: `cognitive.e3.document.email-send` (L4816). | **Parțial aliniat** — `cognitive.nodeKey` vs span v2 (ADR-0003). |
| 7 | Înveliș politică | Validare strictă email; throw pe invalid (`i52` L53–55). | v2: Tier 3, HITL la anomalii (L4806, L4814). | Fără scor încredere în I52. |
| 8 | Rutare model (dacă AI) | **N/A** — vezi N/A. | v2: Non-AI. | — |
| 9 | Guardrails | Regex email; payload Resend explicit. | ADR-0007 — destinație. | — |
| 10 | Escaladare HITL | Nu în I52. | v2 / ADR-0008. | — |
| 11 | Micro-OODA | OBSERVE — job; ORIENT — validare + atașamente; DECIDE — continuă sau throw; ACT — Resend (`i52` L46–94). | v2 OODA generic (L4812). | — |
| 12 | Tier + de-escaladare | Fără tier în cod. | v2 Tier 3 (L4806). | — |
| 13 | Stack (subset) | BullMQ, **Resend** SDK, `@cerniq/db` (`setSessionTenantId`). | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e3.document.email-send`.
- **Cod:** `cognitive.nodeKey` **`e3:document:email-send`** — **parțial aliniat** față de `cognitive.neuron.*`.

---
*Generator inițial:* înlocuit prin audit manual.
