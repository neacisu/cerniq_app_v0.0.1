# Sinapsă `email-warm-send-webhook-timelinesai-ingest`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-warm-send-webhook-timelinesai-ingest` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-warm-send/email-warm-send-webhook-timelinesai-ingest.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-warm-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `email-warm-send` | **Runtime trimitere warm:** **`q:email:warm`** — [`../../../neurons/E2/email--warm--send.md`](../../../neurons/E2/email--warm--send.md), [`../../../neurons/E2/q--email--warm.md`](../../../neurons/E2/q--email--warm.md); **Registry:** `EMAIL_WARM`. |
| Destinație | `webhook-timelinesai-ingest` | **Runtime:** **`webhook:timelinesai:ingest`** — [`../../../neurons/E2/webhook--timelinesai--ingest.md`](../../../neurons/E2/webhook--timelinesai--ingest.md); **Registry:** `WEBHOOK_TIMELINESAI_INGEST`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

**Dependency** din v2 între **`email-warm-send`** și **`webhook-timelinesai-ingest`**. **Dovadă:** v2 §7. **Nedovedit:** payload, retry, safety, telemetrie. TimelinesAI (stări livrare/citire etc.) — contract ingest; muchia sinaptică nu adaugă câmpuri lipsă din export.

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

- **Runtime (ADR-0001):** `EMAIL_WARM` → `WEBHOOK_TIMELINESAI_INGEST`.
- **Semantic (ADR-0002):** `e2:email:warm-send` → `e2:webhook:timelinesai`.
- **Planificare:** capete graf conform registrului.

## Limite și reconcilieri

- Tripla autoritate: nodul graf `email-warm-send` se traduce la **`q:email:warm`** pentru execuție, nu la un queue name literal `email:warm:send` în registry.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-warm-send-webhook-timelinesai-ingest\``.
