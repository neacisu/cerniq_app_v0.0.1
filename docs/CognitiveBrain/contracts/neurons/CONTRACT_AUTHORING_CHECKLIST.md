# Checklist autor — contract neuron

Același conținut ca **Checklist DOD** din planul «Contracte neuroni v2» (puncte 0–11). Bifați înainte de PR sau de mark `completed` pe todo.

## 0. Research individual

Parcurgeți pașii din schema [`_CONTRACT_SCHEMA.md`](_CONTRACT_SCHEMA.md) și secțiunea *Research individual per neuron* din plan: v2 integral → catalog → registry → cod (coada concretă) → teste → ADR ca destinație documentată.

## 1. Bloc v2

Citit integral `### NEURON` până la următorul `### NEURON`.

## 2. Fișier + instanțe

`v2_queue`, Stage, Family; duplicate «duplicat #2» în aceeași etapă → același fișier cu subsecțiuni; duplicate pe **etape diferite** → fișiere separate (`E4/...` vs `E5/...`).

## 3. Tabel self-aware

Toate rândurile 1–13, **per neuron**, din dovezi; **N/A** unde nu se aplică.

## 4. Mapare cod

Handler, payload, metadata job: fișier + ce s-a citit sau „lipsă la audit”.

## 5. Catalog / registry

`v2_queue` ↔ `queueName` ↔ `nodeKey` sau gap în [`NEURON_MATRIX.md`](../../NEURON_MATRIX.md).

## 6. SOFAI + tier + OODA

Explicite; fără LLM/Neo4j pretins unde v2 spune Non-AI sau lipsește codul.

## 7. Observabilitate

OTel v2 vs `cognitive.nodeKey` / atribute reale.

## 8. Șablon

Respectă [`_CONTRACT_SCHEMA.md`](_CONTRACT_SCHEMA.md); legături ADR-FAMILY + ADR globale.

## 9. Matrice

Rând actualizat în `NEURON_MATRIX.*`.

## 10. Lint

`pnpm exec markdownlint` pe fișierul contract.

## 11. Închidere

Reguli [`.cursor/rules/plan-task-execution.mdc`](../../../../.cursor/rules/plan-task-execution.mdc) și diagnostice pe path-uri atinse.

## Protecție regenerare

După ce toate rândurile «În cod» sunt completate din dovezi, adăugați în fișier comentariul HTML `<!-- neuron-contract:author-complete -->` (oriunde în contract). Generatorul `generate_neuron_contracts_from_v2.py` va sări peste acel fișier fără `--force`.

## Reguli Cursor

- [`.cursor/rules/anti-hallucination-global.mdc`](../../../../.cursor/rules/anti-hallucination-global.mdc)
- [`.cursor/rules/documentation-and-research.mdc`](../../../../.cursor/rules/documentation-and-research.mdc)
