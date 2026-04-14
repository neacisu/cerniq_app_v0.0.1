# Sinapsă `winback-campaign-enroll-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `winback-campaign-enroll-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/winback-campaign-enroll/winback-campaign-enroll-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `winback-campaign-enroll` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `winback-campaign-enroll` | Traseu în graf; contract neuron: [`../../../neurons/E5/winback--campaign--enroll.md`](../../../neurons/E5/winback--campaign--enroll.md). **Triplă autoritate:** v2 **`winback:campaign:enroll`**; **runtime (ADR-0001):** **`winback:campaign:create`** (F32), `nodeKey` **`e5:winback:campaign-create`** — vezi neuron; **nu** există literal registry `winback:campaign:enroll`. |
| Destinație (graf) | `e5-winback` | Agregat **familie winback** în planificare. ADR: [`../../../../adr/families/e5/winback.md`](../../../../adr/families/e5/winback.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **winback-campaign-enroll** sub agregatul **`e5-winback`**. v2: **„specializează familia”**; exportul **nu** encodează payload, retry, safety sau telemetrie per-muchie.

## Sinapse dependență în același traseu

[`winback-campaign-enroll-hitl-dashboard-metrics.md`](winback-campaign-enroll-hitl-dashboard-metrics.md), [`winback-campaign-enroll-hitl-dashboard-sync.md`](winback-campaign-enroll-hitl-dashboard-sync.md), [`winback-campaign-enroll-hitl-task-create.md`](winback-campaign-enroll-hitl-task-create.md), [`winback-campaign-enroll-hitl-task-expire-check.md`](winback-campaign-enroll-hitl-task-expire-check.md), [`winback-campaign-enroll-hitl-task-nps-followup.md`](winback-campaign-enroll-hitl-task-nps-followup.md), [`winback-campaign-enroll-hitl-task-resolve.md`](winback-campaign-enroll-hitl-task-resolve.md).

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

- **Planificare:** v2 §7 — `winback-campaign-enroll` → `e5-winback`.
- **Semantic / runtime:** „enroll” (graf) vs „create” (coadă) — reconciliere în `winback--campaign--enroll.md`.

## Limite și reconcilieri

- **v2 vs cod (F32):** neuronul înregistrează posibile contradicții (ex. rutare LLM în v2 vs logică deterministă citită) — nu le rezolvăm prin inventare aici.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`winback-campaign-enroll-family\``.
