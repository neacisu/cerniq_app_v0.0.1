# Sinapsă `association-sync-schedule-geo-neighbor-find`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `association-sync-schedule-geo-neighbor-find` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/association-sync-schedule/association-sync-schedule-geo-neighbor-find.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `association-sync-schedule` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `association-sync-schedule` | **Contract:** [`../../../neurons/E5/association--sync--schedule.md`](../../../neurons/E5/association--sync--schedule.md). **Runtime:** gap documentat în neuron. |
| Destinație (graf) | `geo-neighbor-find` | **Contract (neuron):** [`../../../neurons/E5/geo--neighbor--find.md`](../../../neurons/E5/geo--neighbor--find.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **association-sync-schedule** depinde în planificare de **găsire vecini geo** (`geo-neighbor-find`). v2: **„sinapsă canonică de pipeline”**.

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

- **Runtime (ADR-0001):** conform neuronului țintă și registry.
- **Semantic (ADR-0002):** familie geo E5 — vezi catalog în contract neuron.
- **Planificare:** v2 §7 — `association-sync-schedule` → `geo-neighbor-find`.

## Limite și reconcilieri

- Execuția cozii pentru `geo-neighbor-find` nu se deduce din această pagină; folosiți contractul neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`association-sync-schedule-geo-neighbor-find\``.
