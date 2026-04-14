# Sinapsă `winback-trigger-subsidy-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `winback-trigger-subsidy-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/winback-trigger-subsidy/winback-trigger-subsidy-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `winback-trigger-subsidy` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `winback-trigger-subsidy` | Traseu în graf; contract neuron: [`../../../neurons/E5/winback--trigger--subsidy.md`](../../../neurons/E5/winback--trigger--subsidy.md). **Triplă autoritate:** v2 **`winback:trigger:subsidy`** (familie graf `winback`); **runtime:** **nu** există coadă BullMQ cu acest literal — mapare apropiată pe **`alerts:apia:seasonal`** (J54) și **`alerts:campaign:trigger`** (J55), vezi neuron și `trigger--subsidy--calendar.md`. |
| Destinație (graf) | `e5-winback` | Agregat **familie winback** în planificare. ADR: [`../../../../adr/families/e5/winback.md`](../../../../adr/families/e5/winback.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **winback-trigger-subsidy** sub agregatul **`e5-winback`**. v2: **„specializează familia”**; exportul **nu** encodează payload, retry, safety sau telemetrie per-muchie.

## Sinapse dependență în același traseu

[`winback-trigger-subsidy-hitl-dashboard-metrics.md`](winback-trigger-subsidy-hitl-dashboard-metrics.md), [`winback-trigger-subsidy-hitl-dashboard-sync.md`](winback-trigger-subsidy-hitl-dashboard-sync.md), [`winback-trigger-subsidy-hitl-task-create.md`](winback-trigger-subsidy-hitl-task-create.md), [`winback-trigger-subsidy-hitl-task-expire-check.md`](winback-trigger-subsidy-hitl-task-expire-check.md), [`winback-trigger-subsidy-hitl-task-nps-followup.md`](winback-trigger-subsidy-hitl-task-nps-followup.md), [`winback-trigger-subsidy-hitl-task-resolve.md`](winback-trigger-subsidy-hitl-task-resolve.md).

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

- **Planificare:** v2 §7 — `winback-trigger-subsidy` → `e5-winback`.
- **Semantic / runtime:** familie **graf** winback vs cozi **alerte** în cod — reconciliere explicită în `winback--trigger--subsidy.md` (fără echivalență automată cu `winback:campaign:create`).

## Limite și reconcilieri

- **Contradicție planificare vs implementare:** nodul este sub **e5-winback** în export; execuția apropiată documentată este în **familia alerts** (J54/J55) — nu inferăm legături suplimentare neatested în cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`winback-trigger-subsidy-family\``.
