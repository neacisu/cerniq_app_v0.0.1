# Sinapsă `geo-cluster-analyze-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `geo-cluster-analyze-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/geo-cluster-analyze/geo-cluster-analyze-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `geo-cluster-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `geo-cluster-analyze` | Traseu în graf; contract neuron: [`../../../neurons/E5/geo--cluster--analyze.md`](../../../neurons/E5/geo--cluster--analyze.md). **Triplă autoritate:** v2 **`geo:cluster:analyze`**; **runtime (ADR-0001):** **`cluster:implicit:detect`** / `E5_CLUSTER_IMPLICIT_DETECT` — vezi neuron; **semantic (ADR-0002):** **`e5:cluster:implicit-detect`** — vezi neuron. |
| Destinație (graf) | `e5-geo` | Agregat **familie geo** în planificare. ADR indicativ: [`../../../../adr/families/e5/geo.md`](../../../../adr/families/e5/geo.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **geo-cluster-analyze** sub agregatul **`e5-geo`**. v2: **„specializează familia”**; exportul **nu** encodează payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`geo-cluster-analyze-nurturing-engagement-track.md`](geo-cluster-analyze-nurturing-engagement-track.md), [`geo-cluster-analyze-nurturing-loyalty-achieved.md`](geo-cluster-analyze-nurturing-loyalty-achieved.md), [`geo-cluster-analyze-nurturing-loyalty-check.md`](geo-cluster-analyze-nurturing-loyalty-check.md), [`geo-cluster-analyze-nurturing-nps-process.md`](geo-cluster-analyze-nurturing-nps-process.md), [`geo-cluster-analyze-nurturing-nps-send.md`](geo-cluster-analyze-nurturing-nps-send.md), [`geo-cluster-analyze-nurturing-onboarding-complete.md`](geo-cluster-analyze-nurturing-onboarding-complete.md), [`geo-cluster-analyze-nurturing-onboarding-start.md`](geo-cluster-analyze-nurturing-onboarding-start.md), [`geo-cluster-analyze-nurturing-onboarding-step.md`](geo-cluster-analyze-nurturing-onboarding-step.md), [`geo-cluster-analyze-nurturing-state-transition.md`](geo-cluster-analyze-nurturing-state-transition.md).

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

- **Planificare:** v2 §7 — `geo-cluster-analyze` → `e5-geo`.
- **Runtime / semantic:** vezi [`../../../neurons/E5/geo--cluster--analyze.md`](../../../neurons/E5/geo--cluster--analyze.md); implementare cluster implicite — vezi și ADR [graph-community](../../../../adr/families/e5/graph-community.md) în contractul neuronului.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Slug graf **`geo-cluster-analyze`** ≠ nume coadă v2 **`geo:cluster:analyze`** ≠ coadă runtime **`cluster:implicit:detect`** — reconciliere explicită în contractul neuronului.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`geo-cluster-analyze-family\``.
