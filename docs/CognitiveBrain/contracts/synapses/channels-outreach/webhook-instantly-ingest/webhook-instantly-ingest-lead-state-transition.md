# Sinapsă `webhook-instantly-ingest-lead-state-transition`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `webhook-instantly-ingest-lead-state-transition` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/webhook-instantly-ingest/webhook-instantly-ingest-lead-state-transition.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `webhook-instantly-ingest` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `webhook-instantly-ingest` | **Contract:** [`../../../neurons/E2/webhook--instantly--ingest.md`](../../../neurons/E2/webhook--instantly--ingest.md). |
| Destinație (graf) | `lead-state-transition` | **Contract:** [`../../../neurons/E2/lead--state--transition.md`](../../../neurons/E2/lead--state--transition.md). **Runtime:** `QUEUES.LEAD_STATE_TRANSITION` → `lead:state:transition`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **ingest Instantly** și **tranziție stare lead (FSM)** în graful de planificare. Producătorii efectivi ai job-ului FSM **nu** sunt enumerați în exportul sinapsei.

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

- **Runtime:** webhook ingest vs worker FSM — registry.
- **Semantic:** webhooks → lead-fsm.
- **Planificare:** `dependency`.

## Limite și reconcilieri

- Alte surse (ex. `email.ts`) enfilează și ele `lead:state:transition`; muchia declară doar legătura din ingest spre FSM în **graf**.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`webhook-instantly-ingest-lead-state-transition\``.
