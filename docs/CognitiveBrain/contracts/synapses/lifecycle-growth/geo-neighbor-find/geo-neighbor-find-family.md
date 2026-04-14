# Sinapsă `geo-neighbor-find-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `geo-neighbor-find-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/geo-neighbor-find/geo-neighbor-find-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `geo-neighbor-find` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `geo-neighbor-find` | Traseu în graf; contract neuron: [`../../../neurons/E5/geo--neighbor--find.md`](../../../neurons/E5/geo--neighbor--find.md). **Triplă autoritate:** v2 **`geo:neighbor:find`**; **runtime (ADR-0001):** **`geo:neighbor:identify`** / `E5_GEO_NEIGHBOR_IDENTIFY` — vezi neuron; **semantic (ADR-0002):** **`e5:geo:neighbor-identify`** — vezi neuron. |
| Destinație (graf) | `e5-geo` | Agregat **familie geo** în planificare. ADR indicativ: [`../../../../adr/families/e5/geo.md`](../../../../adr/families/e5/geo.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **geo-neighbor-find** sub agregatul **`e5-geo`**. v2: **„specializează familia”**; exportul **nu** encodează payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`geo-neighbor-find-nurturing-engagement-track.md`](geo-neighbor-find-nurturing-engagement-track.md), [`geo-neighbor-find-nurturing-loyalty-achieved.md`](geo-neighbor-find-nurturing-loyalty-achieved.md), [`geo-neighbor-find-nurturing-loyalty-check.md`](geo-neighbor-find-nurturing-loyalty-check.md), [`geo-neighbor-find-nurturing-nps-process.md`](geo-neighbor-find-nurturing-nps-process.md), [`geo-neighbor-find-nurturing-nps-send.md`](geo-neighbor-find-nurturing-nps-send.md), [`geo-neighbor-find-nurturing-onboarding-complete.md`](geo-neighbor-find-nurturing-onboarding-complete.md), [`geo-neighbor-find-nurturing-onboarding-start.md`](geo-neighbor-find-nurturing-onboarding-start.md), [`geo-neighbor-find-nurturing-onboarding-step.md`](geo-neighbor-find-nurturing-onboarding-step.md), [`geo-neighbor-find-nurturing-state-transition.md`](geo-neighbor-find-nurturing-state-transition.md).

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

- **Planificare:** v2 §7 — `geo-neighbor-find` → `e5-geo`.
- **Runtime / semantic:** vezi [`../../../neurons/E5/geo--neighbor--find.md`](../../../neurons/E5/geo--neighbor--find.md).

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Slug graf **`geo-neighbor-find`** ≠ nume coadă v2 **`geo:neighbor:find`** ≠ coadă runtime **`geo:neighbor:identify`** — vezi contractul neuronului.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`geo-neighbor-find-family\``.
