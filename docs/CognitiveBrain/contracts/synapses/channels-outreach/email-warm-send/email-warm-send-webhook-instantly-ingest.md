# Sinapsă `email-warm-send-webhook-instantly-ingest`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-warm-send-webhook-instantly-ingest` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-warm-send/email-warm-send-webhook-instantly-ingest.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-warm-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `email-warm-send` | **Runtime trimitere warm:** **`q:email:warm`** — [`../../../neurons/E2/email--warm--send.md`](../../../neurons/E2/email--warm--send.md), [`../../../neurons/E2/q--email--warm.md`](../../../neurons/E2/q--email--warm.md); **Registry:** `EMAIL_WARM`. |
| Destinație | `webhook-instantly-ingest` | **Runtime:** **`webhook:instantly:ingest`** — [`../../../neurons/E2/webhook--instantly--ingest.md`](../../../neurons/E2/webhook--instantly--ingest.md); **Registry:** `WEBHOOK_INSTANTLY_INGEST`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

**Dependency** în graf între traseul **`email-warm-send`** și **`webhook-instantly-ingest`**. **Dovadă:** v2 §7. **Nedovedit:** payload, retry, safety, telemetrie. Interpretarea operațională (Instantly ca furnizor de evenimente vs canal warm de trimitere) nu se completează fictiv; vezi contractele neuron.

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

- **Runtime (ADR-0001):** `EMAIL_WARM` → `WEBHOOK_INSTANTLY_INGEST` (nume cozi registry).
- **Semantic (ADR-0002):** `e2:email:warm-send` → `e2:webhook:instantly`.
- **Planificare:** `email-warm-send`, `webhook-instantly-ingest`.

## Limite și reconcilieri

- Slug-ul graf `email-warm-send` nu este numele cozii BullMQ; pentru execuție folosiți **`q:email:warm`**.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-warm-send-webhook-instantly-ingest\``.
