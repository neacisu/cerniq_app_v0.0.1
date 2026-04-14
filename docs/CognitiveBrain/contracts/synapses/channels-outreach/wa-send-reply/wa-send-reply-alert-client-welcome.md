# Sinapsă `wa-send-reply-alert-client-welcome`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-send-reply-alert-client-welcome` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-send-reply/wa-send-reply-alert-client-welcome.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-send-reply` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `wa-send-reply` | **Contract:** [`../../../neurons/E2/wa--send--reply.md`](../../../neurons/E2/wa--send--reply.md). **Runtime:** vezi reconciliere `wa:send:reply` — contract neuron. |
| Destinație (graf) | `alert-client-welcome` | **Contract:** [`../../../neurons/E5/alert--client--welcome.md`](../../../neurons/E5/alert--client--welcome.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **reply WA (planificare)** și **alertă welcome client**. Detalii operaționale în contractele neuron; exportul sinapsei nu le codifică.

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

- **Runtime (ADR-0001):** sursă E2/outreach; destinație E5 — vezi `queue-registry` pentru cozi alertă.
- **Semantic (ADR-0002):** vezi `nodeKey` în contracte.
- **Planificare:** `dependency`.

## Limite și reconcilieri

- **Cross-etapă E2→E5:** mecanismul efectiv de legare depinde de cod, nu de acest export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-send-reply-alert-client-welcome\``.
