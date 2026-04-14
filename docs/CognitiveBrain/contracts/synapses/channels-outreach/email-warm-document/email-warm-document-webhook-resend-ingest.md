# Sinapsă `email-warm-document-webhook-resend-ingest`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-warm-document-webhook-resend-ingest` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-warm-document/email-warm-document-webhook-resend-ingest.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-warm-document` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `email-warm-document` | **Runtime:** **`email:warm:document`** — [`../../../neurons/E2/email--warm--document.md`](../../../neurons/E2/email--warm--document.md); **Registry:** `EMAIL_WARM_DOCUMENT`. |
| Destinație | `webhook-resend-ingest` | **Runtime:** **`webhook:resend:ingest`** — [`../../../neurons/E2/webhook--resend--ingest.md`](../../../neurons/E2/webhook--resend--ingest.md); **Registry:** `WEBHOOK_RESEND_INGEST`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

Muchia **dependency** plasează **`webhook-resend-ingest`** ca succesor planificat față de **`email-warm-document`**, aliniind lane-ul warm „document” cu ingest-ul Resend din perspectiva grafului. **Dovadă:** v2 §7. **Nedovedit:** payload, retry, safety, telemetrie. **Evidență operațională:** contractul neuron `webhook:resend:ingest` și `email:warm:document` descriu cum evenimentele Resend alimentează tracking-ul warm — fără a extinde dincolo de export pentru această sinapsă.

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

- **Runtime (ADR-0001):** `EMAIL_WARM_DOCUMENT` → `WEBHOOK_RESEND_INGEST`.
- **Semantic (ADR-0002):** `e2:email:warm-document` → `e2:webhook:resend`.
- **Planificare:** capete ca în v2.

## Limite și reconcilieri

- Resend este sursa principală de evenimente pentru `email:warm:document` în cod; muchia documentează poziția în graf, nu înlocuiește diagramele de secvență din implementare.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-warm-document-webhook-resend-ingest\``.
