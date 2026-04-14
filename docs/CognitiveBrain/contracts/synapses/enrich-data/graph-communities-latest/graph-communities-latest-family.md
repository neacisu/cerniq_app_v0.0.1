# Sinapsă `graph-communities-latest-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-communities-latest-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-communities-latest/graph-communities-latest-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-communities-latest` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `graph-communities-latest` | Traseu în graf; contract neuron: [`../../../neurons/E5/graph--communities--latest.md`](../../../neurons/E5/graph--communities--latest.md). **Triplă autoritate:** v2 **`graph:communities:latest`**; runtime — **fără** literal același în `queue-registry.ts` la auditul din contract; fluxuri conexe sub **`community:detect:leiden`** / **`cluster:implicit:detect`** — vezi neuron. |
| Destinație (graf) | `e5-graph-community` | Agregat **familie graph-community E5** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e5/graph-community.md`](../../../../adr/families/e5/graph-community.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **graph-communities-latest** sub agregatul **`e5-graph-community`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`graph-communities-latest-geo-cluster-analyze.md`](graph-communities-latest-geo-cluster-analyze.md), [`graph-communities-latest-geo-delivery-optimize.md`](graph-communities-latest-geo-delivery-optimize.md), [`graph-communities-latest-geo-neighbor-find.md`](graph-communities-latest-geo-neighbor-find.md), [`graph-communities-latest-geo-territory-map.md`](graph-communities-latest-geo-territory-map.md), [`graph-communities-latest-geo-weather-correlate.md`](graph-communities-latest-geo-weather-correlate.md).

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

- **Runtime (ADR-0001):** `e5-graph-community` nu este cheie în `QUEUES`; pentru „ultimele comunități” vezi **gap** nume și cozi alternative în [`graph--communities--latest.md`](../../../neurons/E5/graph--communities--latest.md).
- **Semantic (ADR-0002):** E5 `graph-community` — fără `nodeKey` unic demonstrat pentru eticheta v2 în catalog la auditul din contract — vezi neuron.
- **Planificare:** v2 §7 — `graph-communities-latest` → `e5-graph-community`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Necesită reconciliere graf ↔ registry:** eticheta v2 **`graph:communities:latest`** vs absența literalului în registry — vezi neuron.
- Muchii **intrare** din alte trasee (ex. [`bronze-ingest-pdf-extractor-graph-communities-latest.md`](../bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-graph-communities-latest.md)) sunt contracte separate.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-communities-latest-family\``.
