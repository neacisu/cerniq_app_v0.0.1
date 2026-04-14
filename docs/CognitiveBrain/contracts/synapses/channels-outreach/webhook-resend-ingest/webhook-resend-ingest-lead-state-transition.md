# Sinapsă `webhook-resend-ingest-lead-state-transition`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `webhook-resend-ingest-lead-state-transition` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/webhook-resend-ingest/webhook-resend-ingest-lead-state-transition.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `webhook-resend-ingest` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `webhook-resend-ingest` | **Contract:** [`../../../neurons/E2/webhook--resend--ingest.md`](../../../neurons/E2/webhook--resend--ingest.md). |
| Destinație (graf) | `lead-state-transition` | **Contract:** [`../../../neurons/E2/lead--state--transition.md`](../../../neurons/E2/lead--state--transition.md). **Runtime:** `QUEUES.LEAD_STATE_TRANSITION` → `lead:state:transition`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **ingest Resend** și **tranziție FSM lead** în graful de planificare.

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

- **Runtime / Semantic:** vezi contracte.
- **Planificare:** `dependency`.

## Limite și reconcilieri

- Similar ingest Instantly: validarea lanțului efectiv se face în cod; exportul nu înlocuiește auditul worker-ului.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`webhook-resend-ingest-lead-state-transition\``.
