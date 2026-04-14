# Sinapsă `credit-limit-calculate-contract-sign-complete`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-limit-calculate-contract-sign-complete` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-limit-calculate/credit-limit-calculate-contract-sign-complete.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-limit-calculate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-limit-calculate` | **Contract:** [`../../../neurons/E4/credit--limit--calculate.md`](../../../neurons/E4/credit--limit--calculate.md). **Runtime (ADR-0001):** `credit:limit:calculate` — `E4_CREDIT_LIMIT_CALCULATE` în `workers/shared/src/queue-registry.ts`. |
| Destinație (graf) | `contract-sign-complete` | **Contract (neuron):** [`../../../neurons/E4/contract--sign--complete.md`](../../../neurons/E4/contract--sign--complete.md). **Traseu sinapse:** [`../contract-sign-complete/`](../contract-sign-complete/). **Runtime:** vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-limit-calculate** depinde în planificare de **finalizarea procesării contractului semnat** (`contract-sign-complete`). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie PDF sau stări `gold_contracts`.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** vezi contracte neuron sursă și țintă.
- **Semantic (ADR-0002):** E4 credit ↔ E4 semnătură completă.
- **Planificare:** v2 §7 — `credit-limit-calculate` → `contract-sign-complete`.

## Limite și reconcilieri

- Persistența artefactelor semnate este în cod / contract neuron, nu în câmpurile sinapsei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-limit-calculate-contract-sign-complete\``.
