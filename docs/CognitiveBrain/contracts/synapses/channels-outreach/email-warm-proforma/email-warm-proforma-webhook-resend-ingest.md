# Sinapsă `email-warm-proforma-webhook-resend-ingest`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-warm-proforma-webhook-resend-ingest` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-warm-proforma/email-warm-proforma-webhook-resend-ingest.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-warm-proforma` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `email-warm-proforma` | **Runtime:** **`email:warm:proforma`** — [`../../../neurons/E2/email--warm--proforma.md`](../../../neurons/E2/email--warm--proforma.md); **Registry:** `EMAIL_WARM_PROFORMA`. |
| Destinație | `webhook-resend-ingest` | **Runtime:** **`webhook:resend:ingest`** — [`../../../neurons/E2/webhook--resend--ingest.md`](../../../neurons/E2/webhook--resend--ingest.md); **Registry:** `WEBHOOK_RESEND_INGEST`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

Planificarea include o **dependency** de la **`email-warm-proforma`** la **`webhook-resend-ingest`**, aliniind coada warm „proforma” cu punctul de ingest Resend. **Dovadă:** v2 §7. **Nedovedit:** payload, retry, safety, telemetrie. În cod, `createResendEventProcessorWorker` poate alimenta `email:warm:proforma` — vezi neuron; această sinapsă nu substituie acea dovadă.

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

- **Runtime (ADR-0001):** `EMAIL_WARM_PROFORMA` → `WEBHOOK_RESEND_INGEST`.
- **Semantic (ADR-0002):** `e2:email:warm-proforma` → `e2:webhook:resend`.
- **Planificare:** capete conform v2.

## Limite și reconcilieri

- Sensul muchiei este structural (DAG); direcția fluxului de date între webhook și coadă se validează în implementare.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-warm-proforma-webhook-resend-ingest\``.
