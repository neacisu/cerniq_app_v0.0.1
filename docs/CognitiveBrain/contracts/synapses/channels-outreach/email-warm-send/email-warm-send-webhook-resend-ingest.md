# Sinapsă `email-warm-send-webhook-resend-ingest`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-warm-send-webhook-resend-ingest` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-warm-send/email-warm-send-webhook-resend-ingest.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-warm-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `email-warm-send` | **Runtime trimitere warm:** **`q:email:warm`** — [`../../../neurons/E2/email--warm--send.md`](../../../neurons/E2/email--warm--send.md), [`../../../neurons/E2/q--email--warm.md`](../../../neurons/E2/q--email--warm.md); **Registry:** `EMAIL_WARM`. |
| Destinație | `webhook-resend-ingest` | **Runtime:** **`webhook:resend:ingest`** — [`../../../neurons/E2/webhook--resend--ingest.md`](../../../neurons/E2/webhook--resend--ingest.md); **Registry:** `WEBHOOK_RESEND_INGEST`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

Exportul leagă **`email-warm-send`** de **`webhook-resend-ingest`** prin **dependency**, poziționând ingest-ul Resend relativ la traseul de trimitere warm în planificare. **Dovadă:** v2 §7. **Nedovedit:** payload, retry, safety, telemetrie. În practică, Resend alimentează procesatoare care pot atinge cozi warm de tracking/reply — vezi neuroni; acest contract rămâne la nivelul muchiei din v2.

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

- **Runtime (ADR-0001):** `EMAIL_WARM` → `WEBHOOK_RESEND_INGEST`.
- **Semantic (ADR-0002):** `e2:email:warm-send` → `e2:webhook:resend`.
- **Planificare:** noduri din export.

## Limite și reconcilieri

- Sensul DAG din export poate diferi de ordinea temporală observată în loguri; reconcilierea este operațională, nu rescrisă ca payload aici.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-warm-send-webhook-resend-ingest\``.
