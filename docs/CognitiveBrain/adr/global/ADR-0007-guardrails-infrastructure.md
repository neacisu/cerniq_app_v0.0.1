# ADR-0007 — Guardrails ca infrastructură

| Câmp | Valoare |
| --- | --- |
| ID | ADR-0007 |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Nivel | Global |
| Plan v2 | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §3 «ADR-0007 — Guardrails as infrastructure» |
| Plan legacy | [cerniq_cognitive_brain_master_implementation_plan.md](../../cerniq_cognitive_brain_master_implementation_plan.md) |
| Research | [cerniq_nuronal_research_base.md](../../cerniq_nuronal_research_base.md) |
| Fișiere autoritate (implementare parțială) | [packages/shared/src/cognitive-node-catalog.ts](../../../../packages/shared/src/cognitive-node-catalog.ts), [workers/shared/src/llm-client.ts](../../../../workers/shared/src/llm-client.ts) |

## Context

v2 tratează **guardrails** ca **plan de infrastructură**: NeMo Guardrails, modele dedicate (Prompt Guard, Qwen3Guard), verificări deterministe în cod, și evaluare politici **Cedar** wasm. Acest ADR delimitează ce este **în monorepo** față de **țintă**.

## Decizie (canonică din v2)

- Guardrails nu sunt doar `if` dispersate, ci un **strat** (orchestrare NeMo, modele mici, verificări deterministe, politici Cedar pentru execuție tool-uri).
- Verificările deterministe (preț, stoc, discount, SKU, CUI) rămân în **codul serviciului** conform v2.

## Dovezi în implementarea Cerniq

### Neuronii «guardrail» în catalog (implementat ca taxonomie)

- [packages/shared/src/cognitive-node-catalog.ts](../../../../packages/shared/src/cognitive-node-catalog.ts) — intrări `e3:guardrail:*` mapate la cozi `guardrail:price:check`, `guardrail:stock:check`, `guardrail:discount:check`, `guardrail:sku:validate`, `guardrail:fiscal:validate` (vezi secțiunea M71–M75 din comentariul de antet al fișierului).

### Gateway «guard» HTTP (implementat)

- [workers/shared/src/llm-client.ts](../../../../workers/shared/src/llm-client.ts) — `resolveInfraqGuardBaseUrl()`, `infraqGuardUrl()` pentru apeluri sub `/guard` (ex. analiză prompt — conform comentariilor plan §XIII).

### NeMo / Cedar în dependențe

- Căutare `nemo`, `NeMo`, `@cedar-policy` în `package.json` din repo — **fără potriviri** la audit2026-04-11.
- **Consecință:** stack-ul NeMo/Cedar din v2 este **direcție** sau **în afara** pachetelor Node auditate, nu dovedit ca dependență npm.

## Aliniere la cercetare

Research-ul recomandă straturi de siguranță pentru LLM și execuție tool-uri; **implementarea curentă** combină **cozi + gateway guard** + (implicit) logică în workeri, fără a confirma orchestratorul NeMo în repo.

## Reconciliere v2 ↔ cod

| Componentă v2 | Repo |
| --- | --- |
| NeMo Guardrails v0.20, Colang 2.0, IORails | **Neconfirmat** ca pachet în monorepo. |
| Cedar wasm `@cedar-policy/cedar-wasm` | **Neconfirmat** în `package.json`. |
| Modele Prompt Guard / Qwen3Guard pe VRAM | **Parțial:** rutare spre serviciu guard la `infraq.app`; detaliu model **în afara** acestui repo. |
| Verificări deterministe (preț, stoc, …) | **Taxonomie + cozi** în catalog; logica detaliată în workerii E3 — **nu** extrasă integral aici. |

## Consecințe operaționale

1. Adoptarea NeMo sau Cedar în Node necesită PR dedicat + actualizare acestui ADR cu module și contracte.
2. Până atunci, «guardrails infrastructure» operațională include **Infraq guard HTTP** + **workeri guardrail** din registry.

## Criterii de acceptanță (documentare)

- [ ] Diagramă: request → NeMo (dacă există) → modele mici → Cedar → worker.
- [ ] Listă endpoint-uri `/guard/*` documentate lângă gateway.

## Surse externe

- **NVIDIA NeMo Guardrails:** [https://github.com/NVIDIA/NeMo-Guardrails](https://github.com/NVIDIA/NeMo-Guardrails) — verificat la **2026-04-11** (context produs).
- **Cedar policy:** [https://www.cedarpolicy.com/en](https://www.cedarpolicy.com/en) — verificat la **2026-04-11** (context produs).

## Limită evidență

- Versiunea exactă NeMo v0.20 din v2 **nu** este verificată împotriva unui deployment Cerniq în acest ADR.
- Rutele HTTP exacte ale serviciului guard (`/guard/*`) depind de contractul gateway-ului Infraq; **nu** sunt enumerate exhaustiv aici.

## Legături

- ADR-0003, ADR-0006, familiile `e3/guardrails`; [README Cognitive Brain](../../README.md).
