<!-- neuron-contract:author-complete -->

# Neuron `enrich:email:smtp-verify`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:email:smtp-verify` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--email--smtp-verify.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** înregistrează `enrich:email:smtp-verify` (ToolNeuron, Non-AI). **În repo:** fără coadă dedicată. Verificări **SMTP** raportate de Hunter **email-verifier** includ `smtp_check` și `smtp_server` în `HunterEmailVerifyResult` (`hunter-api-client.ts` ~L171–173, ~L197–198). În `g2-hunter-verifier.ts`, `smtp_check` este copiat în `metadata.hunterVerify` (~L75–76); întregul obiect `result` este scris în `silverEnrichmentLog.responsePayload` (~L99–104), deci `smtp_server` rămâne disponibil în log chiar dacă nu e în JSON-ul compact `hunterPayload`. Nu s-a identificat la audit verificare SMTP standalone (fără Hunter).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:email:smtp-verify\`` (~L2149–2169).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:discover:email-hunter-verify` (~L601–607).
- `workers/enrichment/src/workers/g2-hunter-verifier.ts` — `smtp_check` în `hunterPayload` (~L69–79); `responsePayload: result` (~L99–104).
- `workers/enrichment/src/lib/hunter-api-client.ts` — `smtp_server`, `smtp_check` (~L171–173, ~L197–198).

## Instanțe v2

- **OTel span name (v2 plan):** `cognitive.enrich.email.smtp-verify`
- **Runtime:** `e1:discover:email-hunter-verify`.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** pentru `enrich:email:smtp-verify`. Evidență: **`e1:discover:email-hunter-verify`**. | v2. | v2 §2.4. |
| 2 | Etapă, familie, swimlane | E1; **`enrichment-external`**. | v2. | — |
| 3 | Rol declarat | Cod: câmpuri SMTP din răspuns Hunter, nu flux separat «smtp-only». | v2 generic. | — |
| 4 | NeuronType + SOFAI | `ToolNeuron`; System1. | v2. | — |
| 5 | Criticitate | **MEDIUM**. | v2. | — |
| 6 | Înveliș telemetrie | **`e1:discover:email-hunter-verify`** vs v2 `cognitive.enrich.email.smtp-verify`. | ADR-0003. | Migrare. |
| 7 | Înveliș politică | `callExternalApi` cu provider `hunter`. | v2 tier 4. | OPA: țintă. |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Validare email (~L41–45 `g2-hunter-verifier.ts`). | ADR-0007. | — |
| 10 | Escaladare HITL | Fără HITL. | ADR-0008. | — |
| 11 | Micro-OODA | Job → Hunter → câmpuri SMTP → DB/log. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Eșec API → excepție. | v2. | `smtp_server` nu e în `hunterPayload` compact; doar în `responsePayload` / model complet. |
| 13 | Stack v2 §2.3 (subset) | BullMQ, Hunter API, Postgres. | v2. | — |

### Mapare OTel

- **v2 / plan:** `cognitive.enrich.email.smtp-verify`.
- **Cod:** `e1:discover:email-hunter-verify`.
- **Stare:** **migrare planificată**.
