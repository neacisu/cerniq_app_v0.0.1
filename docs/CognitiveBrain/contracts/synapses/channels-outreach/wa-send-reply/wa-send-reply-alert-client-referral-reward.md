# Sinapsă `wa-send-reply-alert-client-referral-reward`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-send-reply-alert-client-referral-reward` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-send-reply/wa-send-reply-alert-client-referral-reward.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-send-reply` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `wa-send-reply` | **Contract:** [`../../../neurons/E2/wa--send--reply.md`](../../../neurons/E2/wa--send--reply.md). **Runtime:** vezi reconciliere slug `wa:send:reply` ↔ cozi — contract neuron sursă. |
| Destinație (graf) | `alert-client-referral-reward` | **Contract:** [`../../../neurons/E5/alert--client--referral-reward.md`](../../../neurons/E5/alert--client--referral-reward.md). **Runtime / etapă:** vezi contract neuron și `queue-registry.ts` (ADR-0001). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între fluxul **reply WA (planificare)** și neuronul de **alertă client referral reward** în graf. Criteriile de declanșare și lanțul de cozi **nu** sunt în câmpurile sinapsei din export.

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

- **Runtime:** E2 (sursă în model) → E5 (țintă alertă) — etape diferite; validare în registry + contracte.
- **Semantic:** `whatsapp` vs familia alertelor client — catalog.
- **Planificare:** dependență declarativă `dependency`.

## Limite și reconcilieri

- Muchia **nu** dovedește că fiecare traseu `wa-send-reply` enfilează alerta; verificați producătorii din cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-send-reply-alert-client-referral-reward\``.
