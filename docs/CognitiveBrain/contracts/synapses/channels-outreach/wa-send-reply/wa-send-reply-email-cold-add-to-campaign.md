# Sinapsă `wa-send-reply-email-cold-add-to-campaign`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-send-reply-email-cold-add-to-campaign` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-send-reply/wa-send-reply-email-cold-add-to-campaign.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-send-reply` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `wa-send-reply` | **Contract:** [`../../../neurons/E2/wa--send--reply.md`](../../../neurons/E2/wa--send--reply.md). |
| Destinație (graf) | `email-cold-add-to-campaign` | **Contract:** [`../../../neurons/E2/email--cold--add-to-campaign.md`](../../../neurons/E2/email--cold--add-to-campaign.md). **Instanță v2 E5:** există duplicat semantic în graf — implementarea operațională partajată este documentată în contractul E2 (`q:email:cold`). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **reply WA** și **adăugare lead în campanie email rece** în planificare. Execuția concretă folosește cozi/mapări din contractul țintă E2, nu numele literal `email:cold:add-to-campaign` ca și coadă BullMQ.

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

- **Runtime (ADR-0001):** `QUEUES.EMAIL_COLD` / `q:email:cold` — vezi contract E2.
- **Semantic:** outreach WhatsApp vs email cold — catalog.
- **Planificare:** `dependency`.

## Limite și reconcilieri

- **v2 duplicat E5:** nu implică al doilea worker în repo — vezi `E5/email--cold--add-to-campaign.md`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-send-reply-email-cold-add-to-campaign\``.
