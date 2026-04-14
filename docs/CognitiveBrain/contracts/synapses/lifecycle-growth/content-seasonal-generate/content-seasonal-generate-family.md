# Sinapsă `content-seasonal-generate-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `content-seasonal-generate-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/content-seasonal-generate/content-seasonal-generate-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `content-seasonal-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `content-seasonal-generate` | Traseu în graf; contract neuron: [`../../../neurons/E5/content--seasonal--generate.md`](../../../neurons/E5/content--seasonal--generate.md). **Triplă autoritate:** v2 **`content:seasonal:generate`**; în repo **nu** există coadă canonică cu acest literal — neuronul documentează **mapare parțială** spre **`alerts:apia:seasonal`** (J54), semantică de alertă APIA, nu „generare editorială”. |
| Destinație (graf) | `e5-content` | Agregat **familie content E5** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e5/content.md`](../../../../adr/families/e5/content.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **content-seasonal-generate** sub agregatul **`e5-content`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`content-seasonal-generate-alert-client-referral-reward.md`](content-seasonal-generate-alert-client-referral-reward.md), [`content-seasonal-generate-alert-client-welcome.md`](content-seasonal-generate-alert-client-welcome.md), [`content-seasonal-generate-alert-internal-campaign-launched.md`](content-seasonal-generate-alert-internal-campaign-launched.md), [`content-seasonal-generate-alert-internal-churn-daily.md`](content-seasonal-generate-alert-internal-churn-daily.md), [`content-seasonal-generate-alert-internal-competitor-price.md`](content-seasonal-generate-alert-internal-competitor-price.md), [`content-seasonal-generate-alert-internal-delivery-cluster.md`](content-seasonal-generate-alert-internal-delivery-cluster.md), [`content-seasonal-generate-alert-internal-nps-drop.md`](content-seasonal-generate-alert-internal-nps-drop.md), [`content-seasonal-generate-trigger-subsidy-calendar.md`](content-seasonal-generate-trigger-subsidy-calendar.md).

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

- **Planificare:** v2 §7 — `content-seasonal-generate` → `e5-content`.
- **Runtime (ADR-0001) / Semantic (ADR-0002):** **necesită reconciliere graf ↔ registry** pentru pasul v2 „seasonal” — vezi neuron (fără worker dedicat sub același nume).

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Orice echivalență cu **J54** / **`alerts:apia:seasonal`** rămâne **parțială** și este detaliată în contractul neuron, nu extinsă aici.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`content-seasonal-generate-family\`` (L14830–L14841).
