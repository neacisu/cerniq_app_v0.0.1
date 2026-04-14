# Sinapsă `enrich-apia-farmer-lookup-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-apia-farmer-lookup-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-apia-farmer-lookup/enrich-apia-farmer-lookup-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-apia-farmer-lookup` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-apia-farmer-lookup` | **v2 / Matrix:** `enrich:apia:farmer-lookup`. **Contract:** [`../../../neurons/E1/enrich--apia--farmer-lookup.md`](../../../neurons/E1/enrich--apia--farmer-lookup.md). **Runtime (ADR-0001):** **`agri:apia`** (`AGRI_APIA` în `queue-registry.ts`) — **nu** literalul `enrich:apia:farmer-lookup`. |
| Destinație (graf) | `e1-enrichment` | Agregat planificare **enrichment** E1. **ADR:** [`../../../../adr/families/e1/enrichment.md`](../../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul **lookup fermier APIA** sub **`e1-enrichment`**. v2: **„specializează familia”**. Execuția rulează pe **`agri:apia`** (`apiaDataProcessor`) — vezi neuron.

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

- **Runtime:** `e1:agri:apia` / **`agri:apia`**.
- **Semantic:** etichetă v2 `enrich:apia:farmer-lookup` vs coadă unică APIA în cod.
- **Planificare:** traseu → `e1-enrichment`.

## Limite și reconcilieri

- Există și traseul v2 distinct **`enrich-apia-subsidies`** cu **același** runtime `agri:apia` — vezi [`enrich--apia--subsidies.md`](../../../neurons/E1/enrich--apia--subsidies.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-apia-farmer-lookup-family\``.
