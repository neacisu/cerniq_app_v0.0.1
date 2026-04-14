# Sinapsă `wa-send-initial-trigger-subsidy-calendar`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-send-initial-trigger-subsidy-calendar` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-send-initial/wa-send-initial-trigger-subsidy-calendar.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-send-initial` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `wa-send-initial` | **`wa:send:initial`** (graf) — [`../../../neurons/E2/wa--send--initial.md`](../../../neurons/E2/wa--send--initial.md); **runtime:** **`q:wa:phone-NN`**. |
| Destinație | `trigger-subsidy-calendar` | Graf **`trigger:subsidy:calendar`** — [`../../../neurons/E5/trigger--subsidy--calendar.md`](../../../neurons/E5/trigger--subsidy--calendar.md). **Runtime (semantic din neuron):** coada **`alerts:apia:seasonal`**, **`QUEUES.E5_ALERT_APIA_SEASONAL`** în `workers/shared/src/queue-registry.ts` — reconciliere explicită acolo unde v2 folosește eticheta „trigger”. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

**Dependency** din plan între **WA inițial** și **trigger calendar subvenții / fereastra APIA** (nod `trigger-subsidy-calendar`). **Dovadă:** v2 §7. **Nedovedit:** payload, retry, safety, telemetrie. Implementarea J54 / nurturing — în contractul neuron E5, nu extinsă aici.

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

- **Runtime (ADR-0001):** sursă — cozi WA per-telefon; țintă — **`alerts:apia:seasonal`** (per contract neuron).
- **Semantic (ADR-0002):** `e5:alert:apia-seasonal` — vezi catalog.
- **Planificare:** capete `wa-send-initial`, `trigger-subsidy-calendar`.

## Limite și reconcilieri

- Nume graf „trigger” vs coadă **`alerts:apia:seasonal`** — documentat în `trigger--subsidy--calendar.md`; fără inventare suplimentară.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-send-initial-trigger-subsidy-calendar\``.
