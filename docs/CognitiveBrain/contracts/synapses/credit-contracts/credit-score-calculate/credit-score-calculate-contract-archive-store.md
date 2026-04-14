# Sinapsă `credit-score-calculate-contract-archive-store`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-score-calculate-contract-archive-store` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-score-calculate/credit-score-calculate-contract-archive-store.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-score-calculate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-score-calculate` | **Contract:** [`../../../neurons/E4/credit--score--calculate.md`](../../../neurons/E4/credit--score--calculate.md). **Runtime (ADR-0001):** `credit:score:calculate` — `E4_CREDIT_SCORE_CALCULATE` în `workers/shared/src/queue-registry.ts`. |
| Destinație (graf) | `contract-archive-store` | **Contract:** [`../../../neurons/E3/contract--archive--store.md`](../../../neurons/E3/contract--archive--store.md). **Semantic (ADR-0002):** `e3:document:archive-store`. **Etapă:** E4 vs E3. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-score-calculate** depinde în planificare de **arhivare/stocare contract** — legătură între calculul scorului de credit și pipeline-ul documentelor. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie politici de arhivare.

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

- **Runtime (ADR-0001):** `credit:score:calculate` vs `document:archive:store` — vezi contracte.
- **Semantic (ADR-0002):** credit E4 → document E3.
- **Planificare:** v2 §7 — `credit-score-calculate` → `contract-archive-store`.

## Limite și reconcilieri

- Ordinea operațională între C17 și arhivare **nu** este în câmpurile sinapsei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-score-calculate-contract-archive-store\``.
