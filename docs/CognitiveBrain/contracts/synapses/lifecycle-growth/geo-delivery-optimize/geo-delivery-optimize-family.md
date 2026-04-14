# Sinapsă `geo-delivery-optimize-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `geo-delivery-optimize-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/geo-delivery-optimize/geo-delivery-optimize-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `geo-delivery-optimize` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `geo-delivery-optimize` | Traseu în graf; contract neuron: [`../../../neurons/E5/geo--delivery--optimize.md`](../../../neurons/E5/geo--delivery--optimize.md). **Triplă autoritate:** v2 **`geo:delivery:optimize`**; **runtime (ADR-0001):** **fără** literal cu acest nume în registry — vezi neuron (`geo:proximity:calculate`, `geo:catchment:build` ca acoperire parțială documentată); **semantic (ADR-0002):** **`e5:geo:proximity-calculate`** și **`e5:geo:catchment-build`** — vezi neuron. |
| Destinație (graf) | `e5-geo` | Agregat **familie geo** în planificare. ADR indicativ: [`../../../../adr/families/e5/geo.md`](../../../../adr/families/e5/geo.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **geo-delivery-optimize** sub agregatul **`e5-geo`**. v2: **„specializează familia”**; exportul **nu** encodează payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`geo-delivery-optimize-nurturing-engagement-track.md`](geo-delivery-optimize-nurturing-engagement-track.md), [`geo-delivery-optimize-nurturing-loyalty-achieved.md`](geo-delivery-optimize-nurturing-loyalty-achieved.md), [`geo-delivery-optimize-nurturing-loyalty-check.md`](geo-delivery-optimize-nurturing-loyalty-check.md), [`geo-delivery-optimize-nurturing-nps-process.md`](geo-delivery-optimize-nurturing-nps-process.md), [`geo-delivery-optimize-nurturing-nps-send.md`](geo-delivery-optimize-nurturing-nps-send.md), [`geo-delivery-optimize-nurturing-onboarding-complete.md`](geo-delivery-optimize-nurturing-onboarding-complete.md), [`geo-delivery-optimize-nurturing-onboarding-start.md`](geo-delivery-optimize-nurturing-onboarding-start.md), [`geo-delivery-optimize-nurturing-onboarding-step.md`](geo-delivery-optimize-nurturing-onboarding-step.md), [`geo-delivery-optimize-nurturing-state-transition.md`](geo-delivery-optimize-nurturing-state-transition.md).

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

- **Planificare:** v2 §7 — `geo-delivery-optimize` → `e5-geo`.
- **Runtime / semantic:** vezi [`../../../neurons/E5/geo--delivery--optimize.md`](../../../neurons/E5/geo--delivery--optimize.md).

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **1:N runtime:** un singur nod în graf poate corespunde la **mai multe** cozi documentate în repo — vezi contractul neuronului.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`geo-delivery-optimize-family\``.
