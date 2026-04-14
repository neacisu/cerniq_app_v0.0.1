# Sinapsă `association-enrich-termene-geo-weather-correlate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `association-enrich-termene-geo-weather-correlate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/association-enrich-termene/association-enrich-termene-geo-weather-correlate.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `association-enrich-termene` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `association-enrich-termene` | **Contract:** [`../../../neurons/E5/association--enrich--termene.md`](../../../neurons/E5/association--enrich--termene.md). **Runtime (ADR-0001):** vezi neuron — gap nume coadă vs `enrich:termene:*`. |
| Destinație (graf) | `geo-weather-correlate` | **Contract:** [`../../../neurons/E5/geo--weather--correlate.md`](../../../neurons/E5/geo--weather--correlate.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **association-enrich-termene** are dependență sintactică față de nodul **geo-weather-correlate**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie surse meteo sau ferestre temporale.

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

- **Planificare:** v2 §7 — `association-enrich-termene` → `geo-weather-correlate`.
- **Runtime (ADR-0001):** vezi mapările din [`geo--weather--correlate.md`](../../../neurons/E5/geo--weather--correlate.md) și sursa.
- **Semantic (ADR-0002):** E5 geo — vezi neuron țintă.

## Limite și reconcilieri

- **Necesită reconciliere graf ↔ registry** pentru ambele capete — vezi contractele neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`association-enrich-termene-geo-weather-correlate\``.
