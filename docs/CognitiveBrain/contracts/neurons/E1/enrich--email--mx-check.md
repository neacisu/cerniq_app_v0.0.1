<!-- neuron-contract:author-complete -->

# Neuron `enrich:email:mx-check`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:email:mx-check` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--email--mx-check.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** înregistrează coada canonică `enrich:email:mx-check` (ToolNeuron, Non-AI). **În repo (2026-04-11):** nu există procesor BullMQ sau intrare în `queue-registry.ts` cu acest nume literal. Semnalul legat de **înregistrări MX** apare ca **câmp în răspunsurile API** integrate în alte cozi: Hunter **email-verifier** expune `mx_records` (`hunter-api-client.ts`), persistat în `metadata.hunterVerify` de `g2-hunter-verifier.ts` (coada **`discover:email:hunter-verify`**); ZeroBounce **validate** expune `mx_found` (`zerobounce-api-client.ts`), persistat în `metadata.zerobounce` de `g2-zerobounce-validation.ts` (coada **`discover:email:zerobounce`**). Nu s-a găsit la audit rezolvare DNS MX locală (ex. `dns.resolveMx`) dedicată acestui neuron v2.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:email:mx-check\`` (~L2083–2103).
- `packages/shared/src/cognitive-node-catalog.ts` — fără intrare pentru `enrich:email:mx-check`; există `e1:discover:email-hunter-verify` / `e1:discover:email-zerobounce` (~L591–617).
- `workers/shared/src/queue-registry.ts` — `DISCOVER_EMAIL_HUNTER_VERIFY`, `DISCOVER_EMAIL_ZEROBOUNCE` (~L51–53); fără `enrich:email:mx-check`.
- `workers/enrichment/src/main.ts` — procesoare pentru `discover:email:hunter-verify`, `discover:email:zerobounce` (~L136–138).
- `workers/enrichment/src/lib/hunter-api-client.ts` — `HunterEmailVerifyResult.mx_records`, mapare din API (~L162–197).
- `workers/enrichment/src/workers/g2-hunter-verifier.ts` — `withCognitiveSpan("e1:discover:email-hunter-verify", …)`, payload JSON cu `mx_records` (~L18–90).
- `workers/enrichment/src/lib/zerobounce-api-client.ts` — tip `mx_found` (~L20–27).
- `workers/enrichment/src/workers/g2-zerobounce-validation.ts` — `withCognitiveSpan("e1:discover:email-zerobounce", …)`, `mxFound: result.mx_found` (~L18–88).
- `workers/enrichment/src/workers/p1-orchestrate.ts` — enfile explicit doar `discover:email:hunter` pentru domeniu (~L125–127); nu `hunter-verify` / `zerobounce`.
- `apps/api/src/routes/imports-bronze.ts` — catalog runtime workers G2 Hunter / ZeroBounce (~L1829–1841).

## Instanțe v2

- **Coadă v2:** `enrich:email:mx-check` (fără handler dedicat în cod la audit).
- **Semnal MX în cod:** `discover:email:hunter-verify` + `discover:email:zerobounce` (vezi Scop).
- **OTel span name (v2 plan):** `cognitive.enrich.email.mx-check`

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI; fluxurile Hunter/ZeroBounce citate fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap catalog** pentru `enrich:email:mx-check`. **Fără** `queueName` literal în registry. Semnal MX: **`e1:discover:email-hunter-verify`** + **`e1:discover:email-zerobounce`** (cozi `discover:email:hunter-verify`, `discover:email:zerobounce`). | v2 coadă canonică distinctă. | v2 §2.4 — mapare 1:1 neuron v2 ↔ o singură coadă: **nu** îndeplinită; granularitatea MX e înglobată în validări email. |
| 2 | Etapă, familie, swimlane | E1; procesoare în worker enrichment; catalog swimlane **`enrichment-external`** pentru cozile Hunter/ZeroBounce. | v2 E1 enrichment. | — |
| 3 | Rol declarat | v2: enrichment generic. Cod: câmpuri `mx_records` / `mx_found` în validări terțe, nu obiectiv izolat «doar MX». | v2 operational text. | — |
| 4 | NeuronType + SOFAI | Pentru cozile care poartă semnalul: `ToolNeuron` în catalog; System1 (reactiv) conform v2 §2.1. | v2 ToolNeuron pentru mx-check. | Neuronul v2 nu are tip în catalog (gap). |
| 5 | Criticitate | Catalog pentru hunter-verify / zerobounce: **MEDIUM**; v2 mx-check: **MEDIUM**. | v2. | — |
| 6 | Înveliș telemetrie | Spanuri reale: **`e1:discover:email-hunter-verify`**, **`e1:discover:email-zerobounce`** (`withCognitiveSpan`). v2 plan: **`cognitive.enrich.email.mx-check`**. | ADR-0003. | Migrare denumiri; fără span dedicat «mx-check». |
| 7 | Înveliș politică | `callExternalApi` pentru providerii `hunter` și `zerobounce`; rate limit / circuit breaker pentru provideri în `worker-shared` (nu re-auditat fișier cu fișier în acest todo). | v2 tier 4. | OPA: țintă ADR-0007. |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Validare email înainte de apel Hunter (~L41–45 `g2-hunter-verifier.ts`); erori API → excepții. | ADR-0007. | — |
| 10 | Escaladare HITL | Fără HITL în procesoarele citate. | ADR-0008. | — |
| 11 | Micro-OODA | Job → API validate → câmp MX în payload → persistare metadata. Neo4j GraphRAG: țintă ADR-0005 dacă lipsește client. | v2 OODA generic. | — |
| 12 | Tier + de-escaladare | Eșec: throw după log în procesoare. | v2 trigger-e. | Fără test unitar care izoleze doar câmpul MX. |
| 13 | Stack v2 §2.3 (subset) | BullMQ, HTTP către Hunter/ZeroBounce, Postgres, Redis. | v2. | — |

### Mapare OTel

- **v2 / plan:** `cognitive.enrich.email.mx-check`.
- **Cod:** spanuri efective pe cozile de validare email (`e1:discover:email-hunter-verify`, `e1:discover:email-zerobounce`).
- **Stare:** **migrare planificată** (fără neuron/coadă dedicată mx-check în runtime).
