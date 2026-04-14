# Sinapsă `association-members-link-geo-weather-correlate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `association-members-link-geo-weather-correlate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/association-members-link/association-members-link-geo-weather-correlate.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `association-members-link` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `association-members-link` | **Contract:** [`../../../neurons/E5/association--members--link.md`](../../../neurons/E5/association--members--link.md). **Runtime (ADR-0001):** `association:member:match` — vezi neuron. |
| Destinație (graf) | `geo-weather-correlate` | **Contract:** [`../../../neurons/E5/geo--weather--correlate.md`](../../../neurons/E5/geo--weather--correlate.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **association-members-link** are dependență sintactică față de nodul **geo-weather-correlate**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie surse meteo.

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

- **Planificare:** v2 §7 — `association-members-link` → `geo-weather-correlate`.
- **Runtime (ADR-0001):** vezi neuroni sursă și țintă.
- **Semantic (ADR-0002):** E5 geo — vezi neuron țintă.

## Limite și reconcilieri

- **Necesită reconciliere graf ↔ registry** — vezi contractele neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`association-members-link-geo-weather-correlate\``.
