# Sinapsă `content-drip-schedule-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `content-drip-schedule-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/content-drip-schedule/content-drip-schedule-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `content-drip-schedule` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `content-drip-schedule` | Traseu în graf; contract neuron: [`../../../neurons/E5/content--drip--schedule.md`](../../../neurons/E5/content--drip--schedule.md). **Triplă autoritate:** v2 **`content:drip:schedule`**; **runtime (ADR-0001):** `E5_CONTENT_DRIP_SCHEDULE` / coadă **`content:drip:schedule`** — vezi neuron; **semantic (ADR-0002):** **`e5:content:drip-schedule`** — vezi neuron. |
| Destinație (graf) | `e5-content` | Agregat **familie content** în planificare. ADR indicativ: [`../../../../adr/families/e5/content.md`](../../../../adr/families/e5/content.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **content-drip-schedule** sub agregatul **`e5-content`**. v2: **„specializează familia”**; exportul **nu** encodează payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`content-drip-schedule-alert-client-referral-reward.md`](content-drip-schedule-alert-client-referral-reward.md), [`content-drip-schedule-alert-client-welcome.md`](content-drip-schedule-alert-client-welcome.md), [`content-drip-schedule-alert-internal-campaign-launched.md`](content-drip-schedule-alert-internal-campaign-launched.md), [`content-drip-schedule-alert-internal-churn-daily.md`](content-drip-schedule-alert-internal-churn-daily.md), [`content-drip-schedule-alert-internal-competitor-price.md`](content-drip-schedule-alert-internal-competitor-price.md), [`content-drip-schedule-alert-internal-delivery-cluster.md`](content-drip-schedule-alert-internal-delivery-cluster.md), [`content-drip-schedule-alert-internal-nps-drop.md`](content-drip-schedule-alert-internal-nps-drop.md), [`content-drip-schedule-trigger-subsidy-calendar.md`](content-drip-schedule-trigger-subsidy-calendar.md).

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

- **Planificare:** v2 §7 — `content-drip-schedule` → `e5-content`.
- **Runtime / semantic:** vezi [`../../../neurons/E5/content--drip--schedule.md`](../../../neurons/E5/content--drip--schedule.md).

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Detalii operaționale I48 → I49 rămân în contractul neuronului, nu în câmpurile sinapsei `default` din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`content-drip-schedule-family\``.
