# ADR-FAMILY-e1-merge

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e1-merge |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E1 |
| Familie | `merge` |
| Plan master | [cerniq_cognitive_brain_master_implementation_plan.md](../../cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e1-merge` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Familia **merge** în planificarea pe graf desemnează fuziunea entităților (ex. companie, contact) la nivel argint. În paralel, în cod există **fuziune asistată de AI** (`ai:merge:xai`) ca neuron distinct, cu rol cognitiv diferit de o fuziune strict relațională.

## Dovezi confirmate în Cerniq

### În cod și registry

- În [packages/shared/src/cognitive-node-catalog.ts](../../../../packages/shared/src/cognitive-node-catalog.ts), căutarea după `merge` pentru E1 returnează:
  - `e1:ai:merge-xai` → coadă **`ai:merge:xai`** (fuziune inteligentă date duplicate cu AI xAI), swimlane **`ai-analysis`**.
- **Nu** există în același catalog, la audit, intrări `e1:merge:company` sau cozi `merge:company` / `merge:contact` pentru E1.
- În [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts): `AI_MERGE_XAI: "ai:merge:xai"` — confirmat; **nu** există `silver:merge:*` sau `merge:company` în snippet-ul de constante.

### În exportul de graf (plan master)

- **2** neuroni; exemple: `silver:merge:company`, `silver:merge:contact`.

### Reconciliere registry / export graf

- **Disjuncție majoră:** graful planifică **două** neuroni „merge” silver; runtime-ul catalogat include **fuziune AI** sub `ai:merge:xai`, dar **nu** include cozi `silver:merge:*` sau `merge:company` în registry la audit.
- **Consecință:** fie fuziunea entităților este implementată sub alt nume / în alt strat, fie este **numai planificată** în graf. Orice documentație operațională trebuie să evite afirmația că `silver:merge:company` este coadă BullMQ activă fără dovada din registry.

## Decizie de guvernanță familială

1. **Proprietar:** Data Architecture E1 + AI (pentru `ai:merge:xai`).
2. **Capabilitate (țintă):** fuziune deterministă a înregistrărilor duplicate după reguli de business + opțional fuziune asistată de model pentru cazuri ambigue.
3. **Telemetrie:** pentru `ai:merge:xai`, același pachet de observabilitate ca familia AI E1; pentru merge relațional viitor, aceleași primitive cognitive.
4. **Anomalii:** conflicte de câmp ne-rezolvate, pierdere date sursă, inconsistență după fuziune.
5. **Guardrail / HITL:** fuziuni cu impact legal/financiar → escaladare (familia `hitl`).

## Aliniere la cercetare

Research-ul subliniază **ieșiri structurate** și **încredere** pentru decizii de fuziune; `ai:merge:xai` trebuie tratat ca punct de risc **HIGH** conform catalogului.

## Observabilitate

- `ai:merge:xai`: span `cognitive:e1:ai:merge-xai` (conform `nodeKey` din catalog).

## Contracte și indexare

- Contracte: căutare `merge` în [contracts/neurons/](../../contracts/neurons/) — așteptat cel puțin variante pentru `ai:merge:xai`; pentru `silver:merge:*`, doar dacă regenerate din graf.
- Sinapse: legături de la dedup/scoruri — [contracts/synapses/](../../contracts/synapses/).

## Criterii de acceptanță

- [ ] ADR fiu sau ticket care închide gap-ul `silver:merge:*` ↔ runtime.
- [ ] Reguli de precedență sursă la fuziune documentate.

## Research extern

- Nu obligatoriu pentru acest ADR.

## Limită evidență

- **Merge non-AI** (`silver:merge:company/contact`) **nu** este confirmat în `queue-registry.ts` sau în `COGNITIVE_NODE_CATALOG` la data documentului.
