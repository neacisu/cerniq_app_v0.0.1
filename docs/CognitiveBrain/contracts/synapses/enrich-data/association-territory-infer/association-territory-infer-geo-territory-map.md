# Sinapsă `association-territory-infer-geo-territory-map`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `association-territory-infer-geo-territory-map` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/association-territory-infer/association-territory-infer-geo-territory-map.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `association-territory-infer` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `association-territory-infer` | **Contract:** [`../../../neurons/E5/association--territory--infer.md`](../../../neurons/E5/association--territory--infer.md). **Notă:** neuronul citează **C17** (`geo:territory:calculate`) ca apropiere semantică față de teritorii — **nu** echivalență de nume cu acest slug graf. |
| Destinație (graf) | `geo-territory-map` | **Contract (neuron):** [`../../../neurons/E5/geo--territory--map.md`](../../../neurons/E5/geo--territory--map.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **association-territory-infer** depinde în planificare de **hartă teritoriu geo**. v2: **„sinapsă canonică de pipeline”**. Alinierea la **inferență teritoriu** din neuronul sursă este **interpretativă** (același traseu de planificare), nu un câmp suplimentar din export.

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

- **Runtime (ADR-0001):** reconciliere obligatorie în neuroni (sursă cu gap literal; țintă cu coadă din registry).
- **Semantic (ADR-0002):** E5 geo — vezi contracte.
- **Planificare:** v2 §7 — `association-territory-infer` → `geo-territory-map`.

## Limite și reconcilieri

- **Risc:** confundarea `geo-territory-map` (graf) cu **`geo:territory:calculate`** (coadă din neuron sursă); se separă prin citirea [`../../../neurons/E5/association--territory--infer.md`](../../../neurons/E5/association--territory--infer.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`association-territory-infer-geo-territory-map\``.
