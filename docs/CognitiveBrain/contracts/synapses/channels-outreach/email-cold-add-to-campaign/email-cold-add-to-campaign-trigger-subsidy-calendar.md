# Sinapsă `email-cold-add-to-campaign-trigger-subsidy-calendar`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-cold-add-to-campaign-trigger-subsidy-calendar` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-cold-add-to-campaign/email-cold-add-to-campaign-trigger-subsidy-calendar.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-cold-add-to-campaign` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `email-cold-add-to-campaign` | **Contract:** [`../../../neurons/E2/email--cold--add-to-campaign.md`](../../../neurons/E2/email--cold--add-to-campaign.md). **Runtime:** `q:email:cold` — vezi contract neuron. |
| Destinație (graf) | `trigger-subsidy-calendar` | **Contract:** [`../../../neurons/E5/trigger--subsidy--calendar.md`](../../../neurons/E5/trigger--subsidy--calendar.md). **Runtime (ADR-0001):** graf `trigger:subsidy:calendar` **fără** literal în registry; contractul neuron mapează proximitate la **`alerts:apia:seasonal`** / `e5:alert:apia-seasonal` — vezi fișier neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Cold add-to-campaign** depinde în planificare de **trigger-ul calendar subvenții**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie ferestre APIA, clienți eligibili sau lanțul J54/J55.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
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

- **Runtime (ADR-0001):** **reconciliere obligatorie** nod graf vs cozi reale — [`../../../neurons/E5/trigger--subsidy--calendar.md`](../../../neurons/E5/trigger--subsidy--calendar.md).
- **Semantic (ADR-0002):** `e5:alert:apia-seasonal` dacă este maparea auditată în contract.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Nu trata `trigger-subsidy-calendar` din graf ca nume de coadă BullMQ fără contractul neuron.
- Legătura cu outreach cold este **doar** din exportul de planificare; cauzalitatea în cod trebuie verificată separat.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-cold-add-to-campaign-trigger-subsidy-calendar\``.
