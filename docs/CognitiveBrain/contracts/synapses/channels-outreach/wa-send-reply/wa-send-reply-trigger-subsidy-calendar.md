# Sinapsă `wa-send-reply-trigger-subsidy-calendar`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-send-reply-trigger-subsidy-calendar` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-send-reply/wa-send-reply-trigger-subsidy-calendar.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-send-reply` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `wa-send-reply` | **Contract:** [`../../../neurons/E2/wa--send--reply.md`](../../../neurons/E2/wa--send--reply.md). |
| Destinație (graf) | `trigger-subsidy-calendar` | **Contract:** [`../../../neurons/E5/trigger--subsidy--calendar.md`](../../../neurons/E5/trigger--subsidy--calendar.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **reply WA (E2 în model)** și **declanșator calendar subvenții (E5 în catalog)** în graful de planificare. Mecanismul de legătură între etape **nu** este în câmpurile sinapsei.

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

- **Runtime:** cross-etapă E2 ↔ E5 — verificați registry și worker-ii E5 în contractul țintă.
- **Semantic:** whatsapp vs nurturing/content — catalog.
- **Planificare:** `dependency`.

## Limite și reconcilieri

- **Cross-etapă:** exportul nu precizează condițiile de eligibilitate pentru subvenție.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-send-reply-trigger-subsidy-calendar\``.
