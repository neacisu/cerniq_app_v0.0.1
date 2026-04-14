# Sinapsă `association-territory-infer-geo-neighbor-find`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `association-territory-infer-geo-neighbor-find` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/association-territory-infer/association-territory-infer-geo-neighbor-find.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `association-territory-infer` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `association-territory-infer` | **Contract:** [`../../../neurons/E5/association--territory--infer.md`](../../../neurons/E5/association--territory--infer.md). |
| Destinație (graf) | `geo-neighbor-find` | **Contract (neuron):** [`../../../neurons/E5/geo--neighbor--find.md`](../../../neurons/E5/geo--neighbor--find.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **association-territory-infer** depinde în planificare de **găsire vecini geo**. v2: **„sinapsă canonică de pipeline”**.

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

- **Runtime (ADR-0001):** conform contractelor neuron.
- **Semantic (ADR-0002):** E5 geo — vezi catalog.
- **Planificare:** v2 §7 — `association-territory-infer` → `geo-neighbor-find`.

## Limite și reconcilieri

- Inferența teritoriu (sursă) și vecinătatea geo (țintă) sunt legate **doar** prin această muchie în registrul v2; fără extindere semantică dincolo de textul exportului.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`association-territory-infer-geo-neighbor-find\``.
