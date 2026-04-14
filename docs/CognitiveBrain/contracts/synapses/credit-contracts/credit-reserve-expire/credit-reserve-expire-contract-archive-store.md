# Sinapsă `credit-reserve-expire-contract-archive-store`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-reserve-expire-contract-archive-store` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-reserve-expire/credit-reserve-expire-contract-archive-store.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-reserve-expire` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-reserve-expire` | **Contract:** [`../../../neurons/E4/credit--reserve--expire.md`](../../../neurons/E4/credit--reserve--expire.md). **Runtime (ADR-0001):** `pipeline:reservation:expire` — `E4_RESERVATION_EXPIRE` (v2: `credit:reserve:expire` — vezi neuron). |
| Destinație (graf) | `contract-archive-store` | **Contract:** [`../../../neurons/E3/contract--archive--store.md`](../../../neurons/E3/contract--archive--store.md). **Semantic (ADR-0002):** `e3:document:archive-store`. **Etapă:** E4 sursă (job credit/pipeline) vs E3 arhivare. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-reserve-expire** depinde în planificare de **arhivare/stocare contract** — legătură între expirarea rezervărilor (proces batch/planificat) și pipeline-ul documentelor. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie obiecte arhivate.

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

- **Runtime (ADR-0001):** `pipeline:reservation:expire` vs `document:archive:store` — vezi contracte.
- **Semantic (ADR-0002):** pipeline rezervări ↔ document E3.
- **Planificare:** v2 §7 — `credit-reserve-expire` → `contract-archive-store`.

## Limite și reconcilieri

- Nu se inferă din sinapsă dacă arhivarea urmează imediat expirarea sau este condiționată de alte evenimente.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-reserve-expire-contract-archive-store\``.
