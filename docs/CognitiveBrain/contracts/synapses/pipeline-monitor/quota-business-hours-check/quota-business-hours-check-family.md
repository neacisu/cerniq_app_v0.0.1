# Sinapsă `quota-business-hours-check-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `quota-business-hours-check-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/quota-business-hours-check/quota-business-hours-check-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `quota-business-hours-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `quota-business-hours-check` | Traseu în graf; contract neuron: [`../../../neurons/E2/quota--business-hours--check.md`](../../../neurons/E2/quota--business-hours--check.md). **Triplă autoritate:** v2 **`quota:business-hours:check`**; runtime canonic **`e2:quota:business-hours`** — vezi neuron și `QUEUES.QUOTA_BUSINESS_HOURS_CHECK`. |
| Destinație (graf) | `e2-quota` | Agregat **familie quota E2** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e2/quota.md`](../../../../adr/families/e2/quota.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **quota-business-hours-check** sub agregatul **`e2-quota`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`quota-business-hours-check-outreach-channel-selector.md`](quota-business-hours-check-outreach-channel-selector.md), [`quota-business-hours-check-outreach-orchestrator-dispatch.md`](quota-business-hours-check-outreach-orchestrator-dispatch.md), [`quota-business-hours-check-outreach-orchestrator-router.md`](quota-business-hours-check-outreach-orchestrator-router.md), [`quota-business-hours-check-outreach-phone-allocator.md`](quota-business-hours-check-outreach-phone-allocator.md), [`quota-business-hours-check-outreach-wa-delay.md`](quota-business-hours-check-outreach-wa-delay.md), [`quota-business-hours-check-outreach-wa-reschedule.md`](quota-business-hours-check-outreach-wa-reschedule.md), [`quota-business-hours-check-outreach-wa-send.md`](quota-business-hours-check-outreach-wa-send.md).

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

- **Planificare:** v2 §7 — `quota-business-hours-check` → `e2-quota`.
- **Semantic (ADR-0002):** [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `quota:business-hours:check`, rând **96**; `nodeKey` **`e2:quota:business-hours`**.
- **Runtime (ADR-0001):** vezi contractul neuron și registry.

## Limite și reconcilieri

- **`e2-quota`** ≠ string-ul cozii BullMQ; reconciliere prin ADR familie **quota** și neuron.
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`quota-business-hours-check-family\``.
