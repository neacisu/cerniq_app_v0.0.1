# Sinapsă `content-personalize-ai-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `content-personalize-ai-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/content-personalize-ai/content-personalize-ai-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `content-personalize-ai` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `content-personalize-ai` | Traseu în graf; contract neuron: [`../../../neurons/E5/content--personalize--ai.md`](../../../neurons/E5/content--personalize--ai.md). **Triplă autoritate:** v2 **`content:personalize:ai`**; runtime documentat în neuron ca **`content:template:render`** / **`e5:content:template-render`** — vezi ADR [`../../../../adr/families/e5/content.md`](../../../../adr/families/e5/content.md). |
| Destinație (graf) | `e5-content` | Agregat **familie content E5** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e5/content.md`](../../../../adr/families/e5/content.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **content-personalize-ai** sub agregatul **`e5-content`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`content-personalize-ai-alert-client-referral-reward.md`](content-personalize-ai-alert-client-referral-reward.md), [`content-personalize-ai-alert-client-welcome.md`](content-personalize-ai-alert-client-welcome.md), [`content-personalize-ai-alert-internal-campaign-launched.md`](content-personalize-ai-alert-internal-campaign-launched.md), [`content-personalize-ai-alert-internal-churn-daily.md`](content-personalize-ai-alert-internal-churn-daily.md), [`content-personalize-ai-alert-internal-competitor-price.md`](content-personalize-ai-alert-internal-competitor-price.md), [`content-personalize-ai-alert-internal-delivery-cluster.md`](content-personalize-ai-alert-internal-delivery-cluster.md), [`content-personalize-ai-alert-internal-nps-drop.md`](content-personalize-ai-alert-internal-nps-drop.md), [`content-personalize-ai-trigger-subsidy-calendar.md`](content-personalize-ai-trigger-subsidy-calendar.md).

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

- **Planificare:** v2 §7 — `content-personalize-ai` → `e5-content`.
- **Runtime (ADR-0001) / Semantic (ADR-0002):** vezi neuron — eticheta v2 „AI” vs implementarea **template render** deterministă.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Personalizare AI (v2)** vs **randare șablon (cod)** — documentat în neuron; nu extinde aici dincolo de evidență.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`content-personalize-ai-family\`` (L14713–L14724).
