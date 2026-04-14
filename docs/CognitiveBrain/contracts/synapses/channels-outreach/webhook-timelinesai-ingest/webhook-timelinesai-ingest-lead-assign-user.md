# Sinapsă `webhook-timelinesai-ingest-lead-assign-user`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `webhook-timelinesai-ingest-lead-assign-user` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/webhook-timelinesai-ingest/webhook-timelinesai-ingest-lead-assign-user.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `webhook-timelinesai-ingest` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `webhook-timelinesai-ingest` | **Contract:** [`../../../neurons/E2/webhook--timelinesai--ingest.md`](../../../neurons/E2/webhook--timelinesai--ingest.md). **Runtime:** `webhook:timelinesai:ingest`. **Semantic:** `e2:webhook:timelinesai`. |
| Destinație (graf) | `lead-assign-user` | **Contract:** [`../../../neurons/E2/lead--assign--user.md`](../../../neurons/E2/lead--assign--user.md). **Runtime (ADR-0001):** `lead:assign:user`. **Semantic (ADR-0002):** `e2:lead:assign-user`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, fluxul **ingest TimelinesAI** are dependență canonică spre **asignare utilizator pe lead**. v2: **„sinapsă canonică de pipeline”**; exportul nu precizează când anume (post-ingest direct vs alt orchestrator) se enfilează `lead:assign:user`.

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

- **Runtime (ADR-0001):** ambele cozi apar în registry — vezi contracte neuron.
- **Semantic (ADR-0002):** webhooks E2 → lead-fsm E2.
- **Planificare:** `webhook-timelinesai-ingest` → `lead-assign-user`.

## Limite și reconcilieri

- Contractul ingest descrie în principal **`lead:state:transition`** și analiză sentiment; legătura **structurală** cu `lead-assign-user` vine din graf (v2 §7), nu din payloadul sinapsei — verificare cod pentru enqueue efectiv.
- Fără completări fictive pentru payload sau retry.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`webhook-timelinesai-ingest-lead-assign-user\``.
