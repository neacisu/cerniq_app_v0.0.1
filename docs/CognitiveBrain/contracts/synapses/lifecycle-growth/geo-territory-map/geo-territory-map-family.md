# Sinapsă `geo-territory-map-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `geo-territory-map-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/geo-territory-map/geo-territory-map-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `geo-territory-map` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `geo-territory-map` | Traseu în graf; contract neuron: [`../../../neurons/E5/geo--territory--map.md`](../../../neurons/E5/geo--territory--map.md). **Triplă autoritate:** v2 **`geo:territory:map`**; runtime raportat **`geo:territory:calculate`** / **`e5:geo:territory-calculate`** — vezi neuron; `NEURON_MATRIX.csv`: **`e5:geo:territory-calculate`**. |
| Destinație (graf) | `e5-geo` | Agregat **familie geo E5** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e5/geo.md`](../../../../adr/families/e5/geo.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **geo-territory-map** sub agregatul **`e5-geo`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`geo-territory-map-nurturing-engagement-track.md`](geo-territory-map-nurturing-engagement-track.md), [`geo-territory-map-nurturing-loyalty-achieved.md`](geo-territory-map-nurturing-loyalty-achieved.md), [`geo-territory-map-nurturing-loyalty-check.md`](geo-territory-map-nurturing-loyalty-check.md), [`geo-territory-map-nurturing-nps-process.md`](geo-territory-map-nurturing-nps-process.md), [`geo-territory-map-nurturing-nps-send.md`](geo-territory-map-nurturing-nps-send.md), [`geo-territory-map-nurturing-onboarding-complete.md`](geo-territory-map-nurturing-onboarding-complete.md), [`geo-territory-map-nurturing-onboarding-start.md`](geo-territory-map-nurturing-onboarding-start.md), [`geo-territory-map-nurturing-onboarding-step.md`](geo-territory-map-nurturing-onboarding-step.md), [`geo-territory-map-nurturing-state-transition.md`](geo-territory-map-nurturing-state-transition.md).

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

- **Planificare:** v2 §7 — `geo-territory-map` → `e5-geo`.
- **Runtime (ADR-0001):** `e5-geo` nu este cheie în `QUEUES`; teritoriu — vezi `E5_GEO_TERRITORY_CALCULATE` și neuron.
- **Semantic (ADR-0002):** `e5:geo:territory-calculate` — vezi catalog.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Divergențe v2 vs tip neuron sau bootstrap — vezi contractul sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`geo-territory-map-family\``.
