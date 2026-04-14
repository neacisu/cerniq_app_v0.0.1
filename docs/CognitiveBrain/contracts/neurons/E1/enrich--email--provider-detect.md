<!-- neuron-contract:author-complete -->

# Neuron `enrich:email:provider-detect`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:email:provider-detect` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--email--provider-detect.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** înregistrează `enrich:email:provider-detect` (ToolNeuron, Non-AI). **În repo:** fără coadă sau `nodeKey` catalog cu acest nume. Indicii de **tip furnizor / hosting email** apar în integrări existente: ZeroBounce returnează `smtp_provider` (`zerobounce-api-client.ts`), persistat ca `smtpProvider` în `metadata.zerobounce` (`g2-zerobounce-validation.ts`); Hunter **email-verifier** expune `webmail` (boolean), inclus în `metadata.hunterVerify` (`g2-hunter-verifier.ts`, împreună cu alte câmpuri). Nu există la audit un pipeline izolat «doar provider-detect».

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:email:provider-detect\`` (~L2105–2125).
- `packages/shared/src/cognitive-node-catalog.ts` — fără intrare pentru coada v2; `e1:discover:email-hunter-verify`, `e1:discover:email-zerobounce` (~L601–617).
- `workers/shared/src/queue-registry.ts` — `discover:email:hunter-verify`, `discover:email:zerobounce` (~L51–53).
- `workers/enrichment/src/workers/g2-hunter-verifier.ts` — `hunterPayload` cu `webmail` (~L69–79).
- `workers/enrichment/src/workers/g2-zerobounce-validation.ts` — `smtpProvider: result.smtp_provider` (~L78–88).
- `workers/enrichment/src/lib/hunter-api-client.ts` — `webmail` în `HunterEmailVerifyResult` (~L162–205).
- `workers/enrichment/src/lib/zerobounce-api-client.ts` — `smtp_provider` în tip (~L20–27).

## Instanțe v2

- **OTel span name (v2 plan):** `cognitive.enrich.email.provider-detect`
- **Runtime (semnal provider):** `e1:discover:email-hunter-verify`, `e1:discover:email-zerobounce`.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI; fără LLM în fluxurile citate.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** pentru `enrich:email:provider-detect`. Semnal: **`discover:email:hunter-verify`** + **`discover:email:zerobounce`** (`e1:discover:email-hunter-verify`, `e1:discover:email-zerobounce`). | v2 coadă distinctă. | v2 §2.4 — fără mapare 1:1 coadă v2. |
| 2 | Etapă, familie, swimlane | E1; swimlane catalog **`enrichment-external`** pentru cozile de validare. | v2. | — |
| 3 | Rol declarat | v2: enrichment generic. Cod: `webmail` / `smtp_provider` ca sub-câmpuri ale validării. | v2. | — |
| 4 | NeuronType + SOFAI | `ToolNeuron` pe cozile de validare; System1 (reactiv) per v2 §2.1. | v2. | Tip pentru numele v2: gap catalog. |
| 5 | Criticitate | **MEDIUM** (v2 + catalog cozi conexe). | v2. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan` pe **`e1:discover:email-hunter-verify`** / **`e1:discover:email-zerobounce`**. v2: `cognitive.enrich.email.provider-detect`. | ADR-0003. | Migrare denumiri. |
| 7 | Înveliș politică | Apeluri `hunter` / `zerobounce` prin `callExternalApi`; detalii rate-limit în `worker-shared`. | v2 tier 4. | OPA: destinație documentată. |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Validare format email Hunter (~L41–45 `g2-hunter-verifier.ts`); erori API. | ADR-0007. | — |
| 10 | Escaladare HITL | Fără HITL în fișierele citate. | ADR-0008. | — |
| 11 | Micro-OODA | Job → API → câmpuri provider → metadata contact. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Eșecuri → excepții în procesoare. | v2. | Fără test izolat «provider-detect». |
| 13 | Stack v2 §2.3 (subset) | BullMQ, HTTP Hunter/ZeroBounce, Postgres. | v2. | — |

### Mapare OTel

- **v2 / plan:** `cognitive.enrich.email.provider-detect`.
- **Cod:** spanuri pe cozile Hunter verify / ZeroBounce validate.
- **Stare:** **migrare planificată**.
