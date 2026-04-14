# Sinapsă `content-drip-send-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `content-drip-send-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/content-drip-send/content-drip-send-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `content-drip-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `content-drip-send` | Traseu în graf; contract neuron: [`../../../neurons/E5/content--drip--send.md`](../../../neurons/E5/content--drip--send.md). **Triplă autoritate:** v2 **`content:drip:send`**; runtime documentat în neuron ca **`content:drip:execute`** / **`e5:content:drip-execute`** — vezi ADR [`../../../../adr/families/e5/content.md`](../../../../adr/families/e5/content.md). |
| Destinație (graf) | `e5-content` | Agregat **familie content E5** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e5/content.md`](../../../../adr/families/e5/content.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **content-drip-send** sub agregatul **`e5-content`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`content-drip-send-alert-client-referral-reward.md`](content-drip-send-alert-client-referral-reward.md), [`content-drip-send-alert-client-welcome.md`](content-drip-send-alert-client-welcome.md), [`content-drip-send-alert-internal-campaign-launched.md`](content-drip-send-alert-internal-campaign-launched.md), [`content-drip-send-alert-internal-churn-daily.md`](content-drip-send-alert-internal-churn-daily.md), [`content-drip-send-alert-internal-competitor-price.md`](content-drip-send-alert-internal-competitor-price.md), [`content-drip-send-alert-internal-delivery-cluster.md`](content-drip-send-alert-internal-delivery-cluster.md), [`content-drip-send-alert-internal-nps-drop.md`](content-drip-send-alert-internal-nps-drop.md), [`content-drip-send-trigger-subsidy-calendar.md`](content-drip-send-trigger-subsidy-calendar.md).

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

- **Planificare:** v2 §7 — `content-drip-send` → `e5-content`.
- **Runtime (ADR-0001):** vezi neuron — **`content:drip:send`** (graf) vs **`content:drip:execute`** (registry).
- **Semantic (ADR-0002):** `e5:content:drip-execute` — citat în neuron.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Denumiri graf vs cozi BullMQ — vezi ADR familie **content** și neuronul sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`content-drip-send-family\`` (L14596–L14607).
