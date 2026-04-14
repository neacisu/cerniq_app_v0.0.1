# Sinapsă `graph-community-detect-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-community-detect-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-community-detect/graph-community-detect-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-community-detect` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `graph-community-detect` | Traseu în graf; contract neuron: [`../../../neurons/E5/graph--community--detect.md`](../../../neurons/E5/graph--community--detect.md). **Triplă autoritate:** v2 **`graph:community:detect`**; runtime **`community:detect:leiden`** (`E5_COMMUNITY_DETECT_LEIDEN`) — vezi neuron și `queue-registry.ts`. |
| Destinație (graf) | `e5-graph-community` | Agregat **familie graph-community E5** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e5/graph-community.md`](../../../../adr/families/e5/graph-community.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **graph-community-detect** sub agregatul **`e5-graph-community`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`graph-community-detect-geo-cluster-analyze.md`](graph-community-detect-geo-cluster-analyze.md), [`graph-community-detect-geo-delivery-optimize.md`](graph-community-detect-geo-delivery-optimize.md), [`graph-community-detect-geo-neighbor-find.md`](graph-community-detect-geo-neighbor-find.md), [`graph-community-detect-geo-territory-map.md`](graph-community-detect-geo-territory-map.md), [`graph-community-detect-geo-weather-correlate.md`](graph-community-detect-geo-weather-correlate.md).

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

- **Runtime (ADR-0001):** `e5-graph-community` nu este cheie în `QUEUES`; coada D21 este **`community:detect:leiden`** — vezi [`graph--community--detect.md`](../../../neurons/E5/graph--community--detect.md).
- **Semantic (ADR-0002):** `e5:community:detect-leiden` — vezi catalog citat în neuron.
- **Planificare:** v2 §7 — `graph-community-detect` → `e5-graph-community`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Necesită reconciliere graf ↔ registry:** eticheta v2 **`graph:community:detect`** vs coada **`community:detect:leiden`** — vezi neuron.
- Muchii **intrare** din alte trasee (ex. [`bronze-ingest-pdf-extractor-graph-community-detect.md`](../bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-graph-community-detect.md)) sunt contracte separate.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-community-detect-family\``.
