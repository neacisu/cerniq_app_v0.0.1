# Sinapsă `wa-send-reply-q-email-warm`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-send-reply-q-email-warm` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-send-reply/wa-send-reply-q-email-warm.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-send-reply` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `wa-send-reply` | **Contract:** [`../../../neurons/E2/wa--send--reply.md`](../../../neurons/E2/wa--send--reply.md). |
| Destinație (graf) | `q-email-warm` | **Contract:** [`../../../neurons/E2/q--email--warm.md`](../../../neurons/E2/q--email--warm.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **reply WA** și **coada email warm (`q-email-warm` în graf)** în planificare. Maparea exactă la șirul BullMQ este în contractul neuron și registry.

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

- **Runtime (ADR-0001):** vezi `queue-registry.ts` și neuron.
- **Semantic (ADR-0002):** vezi catalog.
- **Planificare:** `dependency`.

## Limite și reconcilieri

- Legătura WA reply → email warm **nu** implică automat același `tenantId`/lead fără dovezi din cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-send-reply-q-email-warm\``.
