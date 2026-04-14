# Sinapsă `trigger-subsidy-calendar-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `trigger-subsidy-calendar-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/trigger-subsidy-calendar/trigger-subsidy-calendar-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `trigger-subsidy-calendar` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `trigger-subsidy-calendar` | Traseu în graf; contract neuron: [`../../../neurons/E5/trigger--subsidy--calendar.md`](../../../neurons/E5/trigger--subsidy--calendar.md). **Triplă autoritate:** v2 **`trigger:subsidy:calendar`**; **runtime (ADR-0001):** **`alerts:apia:seasonal`** (J54), `nodeKey` **`e5:alert:apia-seasonal`** — vezi neuron și registry; slug graf ≠ literal coadă. |
| Destinație (graf) | `e5-alerts` | Agregat **familie alerts** în planificare. ADR: [`../../../../adr/families/e5/alerts.md`](../../../../adr/families/e5/alerts.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **trigger-subsidy-calendar** sub agregatul **`e5-alerts`**. v2: **„specializează familia”**; exportul **nu** encodează payload, retry, safety sau telemetrie per-muchie.

## Sinapse dependență în același traseu

[`trigger-subsidy-calendar-compliance-audit-generate.md`](trigger-subsidy-calendar-compliance-audit-generate.md), [`trigger-subsidy-calendar-compliance-consent-check.md`](trigger-subsidy-calendar-compliance-consent-check.md), [`trigger-subsidy-calendar-compliance-data-anonymize.md`](trigger-subsidy-calendar-compliance-data-anonymize.md), [`trigger-subsidy-calendar-compliance-optout-process.md`](trigger-subsidy-calendar-compliance-optout-process.md).

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

- **Planificare:** v2 §7 — `trigger-subsidy-calendar` → `e5-alerts`.
- **Semantic / runtime:** calendar APIA / sezonalitate — vezi J54 și contractul neuronului.

## Limite și reconcilieri

- **Familie graf `e5-alerts` vs swimlane catalog** (ex. `alerts-weather`): nealiniere posibilă — documentată în `trigger--subsidy--calendar.md`, nu rezolvată aici prin presupuneri.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`trigger-subsidy-calendar-family\``.
