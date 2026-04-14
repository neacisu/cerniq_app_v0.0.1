# Sinapsă `enrich-apia-subsidies-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-apia-subsidies-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-apia-subsidies/enrich-apia-subsidies-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-apia-subsidies` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-apia-subsidies` | **v2 / Matrix:** `enrich:apia:subsidies`. **Contract:** [`../../../neurons/E1/enrich--apia--subsidies.md`](../../../neurons/E1/enrich--apia--subsidies.md). **Runtime (ADR-0001):** **`agri:apia`** — **același** procesor ca `enrich:apia:farmer-lookup`; **nu** există coadă BullMQ separată pentru șirul v2 `enrich:apia:subsidies` la auditul din neuron. |
| Destinație (graf) | `e1-enrichment` | Agregat **enrichment** E1. **ADR:** [`../../../../adr/families/e1/enrichment.md`](../../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul **subvenții APIA (etichetă graf)** sub **`e1-enrichment`**. v2: **„specializează familia”**. Diferența față de **farmer-lookup** este **semantică în v2**, nu în mapare worker separată — vezi contractul neuron.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime:** un singur `nodeKey` catalog **`e1:agri:apia`** / coadă **`agri:apia`** pentru ambele etichete v2 farmer vs subsidies.
- **Planificare:** două trasee graf distincte → același nucleu runtime — reconciliere explicită necesară în operațiuni.

## Limite și reconcilieri

- Nu deduceți din graf două cozi APIA fără a citi [`enrich--apia--subsidies.md`](../../../neurons/E1/enrich--apia--subsidies.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-apia-subsidies-family\``.
