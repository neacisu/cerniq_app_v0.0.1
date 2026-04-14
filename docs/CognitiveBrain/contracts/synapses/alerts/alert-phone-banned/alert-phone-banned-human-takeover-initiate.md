# Sinapsă `alert-phone-banned-human-takeover-initiate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-phone-banned-human-takeover-initiate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-phone-banned/alert-phone-banned-human-takeover-initiate.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-phone-banned` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `alert-phone-banned` | **Contract:** [`../../../neurons/E2/alert--phone--banned.md`](../../../neurons/E2/alert--phone--banned.md). **Runtime:** `QUEUES.ALERT_PHONE_BANNED` → `alert:phone:banned` — vezi contract neuron. |
| Destinație (graf) | `human-takeover-initiate` | **Contract:** [`../../../neurons/E2/human--takeover--initiate.md`](../../../neurons/E2/human--takeover--initiate.md). **Runtime:** `QUEUES.HUMAN_TAKEOVER_INITIATE` → `human:takeover:initiate`; worker `createHumanTakeoverWorker` — vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Alerta telefon banat** este legată canonic de **inițierea preluării conversației de către om** (oprire automatizare, flag journey). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie criteriul de escaladare.

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

- **Runtime (ADR-0001):** cozi în registry; lanțul alertă → takeover necesită reconciliere cu producători de job-uri — vezi contracte.
- **Semantic (ADR-0002):** monitoring E2 vs human E2 (criticitate CRITICAL în catalog pentru takeover — contract neuron).
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Prezența muchiei în graf nu înlocuiește dovada că fiecare `ALERT_PHONE_BANNED` enfilează takeover.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-phone-banned-human-takeover-initiate\``.
