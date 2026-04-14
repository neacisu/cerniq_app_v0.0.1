# Sinapsă `webhook-resend-ingest-lead-assign-user`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `webhook-resend-ingest-lead-assign-user` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/webhook-resend-ingest/webhook-resend-ingest-lead-assign-user.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `webhook-resend-ingest` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `webhook-resend-ingest` | **Contract:** [`../../../neurons/E2/webhook--resend--ingest.md`](../../../neurons/E2/webhook--resend--ingest.md). |
| Destinație (graf) | `lead-assign-user` | **Contract:** [`../../../neurons/E2/lead--assign--user.md`](../../../neurons/E2/lead--assign--user.md). **Runtime:** `QUEUES.LEAD_ASSIGN_USER` → `lead:assign:user`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **ingest Resend** și **asignare lead** în graful de planificare. Contractul sursă evidențiază trasee warm (proforma/document); enfileierea către **assign user** trebuie verificată în cod.

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

- **Runtime:** webhook E2 → lead FSM.
- **Semantic:** vezi catalog capete.
- **Planificare:** `dependency`.

## Limite și reconcilieri

- **Gap potențial graf ↔ cod:** dacă ingest Resend nu enfilează `lead:assign:user`, muchia rămâne totuși **structurală** în exportul v2; documentăm necesitatea de reconciliere, fără a inventa comportament.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`webhook-resend-ingest-lead-assign-user\``.
