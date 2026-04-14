# Sinapsă `webhook-instantly-ingest-lead-assign-user`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `webhook-instantly-ingest-lead-assign-user` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/webhook-instantly-ingest/webhook-instantly-ingest-lead-assign-user.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `webhook-instantly-ingest` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `webhook-instantly-ingest` | **Contract:** [`../../../neurons/E2/webhook--instantly--ingest.md`](../../../neurons/E2/webhook--instantly--ingest.md). |
| Destinație (graf) | `lead-assign-user` | **Contract:** [`../../../neurons/E2/lead--assign--user.md`](../../../neurons/E2/lead--assign--user.md). **Runtime:** `QUEUES.LEAD_ASSIGN_USER` → `lead:assign:user`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **ingest Instantly** și **asignare lead către utilizator** în graful de planificare. Dacă worker-ul ingest enfilează explicit această coadă **nu** rezultă din câmpurile sinapsei — vezi cod și contract sursă.

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

- **Runtime:** webhooks E2 → lead FSM E2.
- **Semantic:** `e2:webhook:instantly` → `e2:lead:assign-user`.
- **Planificare:** `dependency`.

## Limite și reconcilieri

- Contractul `webhook:instantly:ingest` citează în principal `email:cold:lead:status` pentru tracking — alinierea la **assign user** necesită trasabilitate în cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`webhook-instantly-ingest-lead-assign-user\``.
