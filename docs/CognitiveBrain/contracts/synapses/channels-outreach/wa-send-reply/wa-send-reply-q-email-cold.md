# Sinapsă `wa-send-reply-q-email-cold`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-send-reply-q-email-cold` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-send-reply/wa-send-reply-q-email-cold.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-send-reply` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `wa-send-reply` | **Contract:** [`../../../neurons/E2/wa--send--reply.md`](../../../neurons/E2/wa--send--reply.md). |
| Destinație (graf) | `q-email-cold` | **Contract:** [`../../../neurons/E2/q--email--cold.md`](../../../neurons/E2/q--email--cold.md). **Runtime (ADR-0001):** vezi `QUEUES.EMAIL_COLD` / `q:email:cold` în contract. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **reply WA** și **coada generică email rece (`q-email-cold` în graf)** în planificare. Slug-ul graf poate corespunde cozii `q:email:cold` — confirmați în contractul neuron.

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

- **Runtime:** coadă executabilă în registry — contract `q--email--cold`.
- **Semantic:** catalog `e2:email:cold-send` sau echivalent — vezi neuron.
- **Planificare:** `dependency`.

## Limite și reconcilieri

- **`q-email-cold` (graf)** vs **`q:email:cold` (BullMQ):** reconciliere explicită în contract neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-send-reply-q-email-cold\``.
