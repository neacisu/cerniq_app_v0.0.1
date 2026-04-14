# Sinapsă `graph-relationship-infer-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-relationship-infer-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-relationship-infer/graph-relationship-infer-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-relationship-infer` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `graph-relationship-infer` | Traseu în graf; contract neuron: [`../../../neurons/E5/graph--relationship--infer.md`](../../../neurons/E5/graph--relationship--infer.md). **Triplă autoritate:** v2 **`graph:relationship:infer`**; runtime documentat în neuron ca **`cluster:implicit:detect`** / span **`e5:cluster:implicit-detect`** — **fără** literal `graph:relationship:infer` în registry. |
| Destinație (graf) | `e5-graph-community` | Agregat **familie graph-community E5** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e5/graph-community.md`](../../../../adr/families/e5/graph-community.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **graph-relationship-infer** sub agregatul **`e5-graph-community`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`graph-relationship-infer-geo-cluster-analyze.md`](graph-relationship-infer-geo-cluster-analyze.md), [`graph-relationship-infer-geo-delivery-optimize.md`](graph-relationship-infer-geo-delivery-optimize.md), [`graph-relationship-infer-geo-neighbor-find.md`](graph-relationship-infer-geo-neighbor-find.md), [`graph-relationship-infer-geo-territory-map.md`](graph-relationship-infer-geo-territory-map.md), [`graph-relationship-infer-geo-weather-correlate.md`](graph-relationship-infer-geo-weather-correlate.md).

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

- **Runtime (ADR-0001):** `e5-graph-community` nu este cheie în `QUEUES`; vezi neuron pentru **`cluster:implicit:detect`** și `queue-registry.ts`.
- **Semantic (ADR-0002):** `e5:cluster:implicit-detect` — vezi `cognitive-node-catalog.ts` (citat în neuron).
- **Planificare:** v2 §7 — `graph-relationship-infer` → `e5-graph-community`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Infer vs cluster:** v2 «relationship infer» vs rutina runtime «implicit cluster» — **nu** echivalent 1:1 — **necesită reconciliere graf ↔ registry** — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-relationship-infer-family\``.
