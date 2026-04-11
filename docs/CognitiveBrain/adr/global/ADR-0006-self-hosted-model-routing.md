# ADR-0006 — Rutare modele self-hosted first

| Câmp | Valoare |
| --- | --- |
| ID | ADR-0006 |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Nivel | Global |
| Plan v2 | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §3 «ADR-0006 — Self-hosted-first model routing» |
| Plan legacy | [cerniq_cognitive_brain_master_implementation_plan.md](../../cerniq_cognitive_brain_master_implementation_plan.md) — §XIII gateway dacă e nevoie |
| Research | [cerniq_nuronal_research_base.md](../../cerniq_nuronal_research_base.md) — ieșiri structurate, SGLang, consens modele |
| Fișiere autoritate | [workers/shared/src/llm-client.ts](../../../../workers/shared/src/llm-client.ts), [workers/shared/src/outreach-llm-routing.ts](../../../../workers/shared/src/outreach-llm-routing.ts) |

## Context

v2 descrie o politică **self-hosted-first** (vLLM/QwQ, Qwen fast, embeddings), migrare țintă spre **SGLang** cu **XGrammar**, și **fallback** către modele frontieră cu prag de încredere + escaladare HITL. Trebuie separat ce este **politică țintă** față de **runtime-ul din cod**.

## Decizie (canonică din v2)

- Modelele **self-hosted** sunt primare; modelele **frontieră** sunt excepții controlate.
- **SGLang + XGrammar** — strategie de structurare și performanță pentru reasoning (v2 §2.3 / §3 ADR-0006).
- **Fallback:** dacă încrederea self-hosted &lt;0.80 → consens cu model frontieră; divergență → HITL (legat de ADR-0008).

## Dovezi în implementarea Cerniq

### Gateway unificat (implementat)

- [workers/shared/src/llm-client.ts](../../../../workers/shared/src/llm-client.ts):
  - Bază implicită: `https://infraq.app/llm/v1` (`INFRAQ_DEFAULT_BASE_URL`), suprascrieri prin `INFRAQ_BASE_URL` / `INFRAQ_BASE`.
  - Modele declarate: `INFRAQ_REASONING_MODEL` = `Qwen/QwQ-32B-AWQ`, `INFRAQ_FAST_MODEL` = `Qwen/Qwen2.5-14B-Instruct-AWQ`, `INFRAQ_EMBEDDINGS_MODEL` = `qwen3-embedding-8b-q5km`.
  - Cale **guard** separată: `resolveInfraqGuardBaseUrl()` → `${base}/guard` (token `INFRAQ_GUARD_TOKEN` — OpenBao, după comentarii).
  - **Nu** există în acest fișier apel direct către API-uri Anthropic/OpenAI; clientul este compatibil OpenAI prin gateway.

### Rutare configurabilă E2 (implementat)

- [workers/shared/src/outreach-llm-routing.ts](../../../../workers/shared/src/outreach-llm-routing.ts):
  - Preferințe din `cognitive_node_configs.configOverrides`: `VLLM_FAST`, `VLLM_REASONING`, `ANTHROPIC`.
  - `ANTHROPIC` este **mapat** la același client **reasoning** self-hosted («nu există apel direct Anthropic în workerii outreach» — comentariu în cod).

## Reconciliere v2 (CMDB / porturi) ↔ cod

| Element v2 | Observație |
| --- | --- |
| Hostnames `vllm-reasoning-32b`, porturi 8001/8002/8003 | **CMDB v2** — în cod, traficul este **abstractizat** prin `infraq.app`; **nu** s-a confirmat în acest ADR maparea 1:1 host intern ↔ path gateway. |
| Migrare SGLang v0.5.10 | **Recomandare v2** — **lipsă** dependență sau import SGLang în monorepo Node la audit. |
| XGrammar &lt;40µs | **Recomandare v2** — fără evidență în repo. |
| Fallback frontieră + prag0.80 | **Politică v2** — **nu** s-a găsit în fișierele citite logica completă de consens cross-model; poate fi în alte module — **limită evidență**. |

## Consecințe operaționale

1. Schimbarea gateway-ului sau a numelor de model impune actualizare coordonată `llm-client.ts` + config worker.
2. Orice introducere SGLang trebuie documentată ca înlocuitor sau paralel față de gateway-ul actual, cu ADR actualizat.

## Criterii de acceptanță (documentare)

- [ ] Tabel CMDB v2 ↔ URL/path gateway pentru fiecare rol (reasoning, fast, embed, guard).
- [ ] Dovadă cod sau test pentru fallback frontieră dacă devine cerință hard.

## Surse externe

- **SGLang (proiect):** [https://github.com/sgl-project/sglang](https://github.com/sgl-project/sglang) — verificat la **2026-04-11** (context produs; nu înlocuiește dovada deploy-ului Cerniq).
- **OpenAI API compatibility (referință client):** [https://platform.openai.com/docs/api-reference](https://platform.openai.com/docs/api-reference) — verificat la **2026-04-11** (modelul de compatibilitate folosit de `openai` SDK spre gateway).

## Limită evidență

- Performanță, VRAM și topologia GPU sunt în v2 ca **context infrastructură**, nevalidate din repo.
- Workerii care nu trec prin `llm-client.ts` pot avea căi LLM separate — audit **nu** este exhaustiv pe toate pachetele.

## Legături

- ADR-0003 (metrici LLM), ADR-0007 (guard), ADR-0008 (HITL); [README Cognitive Brain](../../README.md).
