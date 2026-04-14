# Sinapsă `graph-relationship-create-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-relationship-create-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-relationship-create/graph-relationship-create-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-relationship-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `graph-relationship-create` | Traseu în graf; contract neuron: [`../../../neurons/E5/graph--relationship--create.md`](../../../neurons/E5/graph--relationship--create.md). **Triplă autoritate:** v2 **`graph:relationship:create`**; runtime documentat în neuron ca **`graph:build:relationships`** / span **`e5:graph:build-relationships`** — **fără** literal `graph:relationship:create` în registry. |
| Destinație (graf) | `e5-graph-community` | Agregat **familie graph-community E5** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e5/graph-community.md`](../../../../adr/families/e5/graph-community.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **graph-relationship-create** sub agregatul **`e5-graph-community`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`graph-relationship-create-geo-cluster-analyze.md`](graph-relationship-create-geo-cluster-analyze.md), [`graph-relationship-create-geo-delivery-optimize.md`](graph-relationship-create-geo-delivery-optimize.md), [`graph-relationship-create-geo-neighbor-find.md`](graph-relationship-create-geo-neighbor-find.md), [`graph-relationship-create-geo-territory-map.md`](graph-relationship-create-geo-territory-map.md), [`graph-relationship-create-geo-weather-correlate.md`](graph-relationship-create-geo-weather-correlate.md).

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

- **Runtime (ADR-0001):** `e5-graph-community` nu este cheie în `QUEUES`; vezi neuron pentru **`graph:build:relationships`** și `queue-registry.ts`.
- **Semantic (ADR-0002):** `e5:graph:build-relationships` — vezi `cognitive-node-catalog.ts` (citat în neuron).
- **Planificare:** v2 §7 — `graph-relationship-create` → `e5-graph-community`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Verb / nume:** v2 `graph:relationship:create` vs runtime `graph:build:relationships` — **necesită reconciliere graf ↔ registry** — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-relationship-create-family\``.
