# Sinapsă `email-cold-campaign-pause-email-warm-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-cold-campaign-pause-email-warm-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-cold-campaign-pause/email-cold-campaign-pause-email-warm-send.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-cold-campaign-pause` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `email-cold-campaign-pause` | **Runtime:** **`email:cold:campaign:pause`** — [`../../../neurons/E2/email--cold--campaign--pause.md`](../../../neurons/E2/email--cold--campaign--pause.md); **Registry:** `EMAIL_COLD_CAMPAIGN_PAUSE`. |
| Destinație | `email-warm-send` | Nod graf pentru trimitere email warm; **runtime canonic trimitere:** coada **`q:email:warm`** — [`../../../neurons/E2/email--warm--send.md`](../../../neurons/E2/email--warm--send.md), [`../../../neurons/E2/q--email--warm.md`](../../../neurons/E2/q--email--warm.md); **Registry:** `EMAIL_WARM`. **Nu** există cheie `email:warm:send` separată în registry; reconcilierea este documentată în contractul `email:warm:send`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

Exportul plasează o **dependency** de la pauza de campanie cold către traseul **`email-warm-send`** (trimitere / canal warm în plan). **Dovadă muchie:** v2 §7. **Nedovedit de export:** payload, retry, safety, telemetrie. **Atenție:** capătul „send” din graf ≠ nume de coadă literal în registry; pentru execuție se folosește **`q:email:warm`**.

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

- **Runtime (ADR-0001):** sursă pe `email:cold:campaign:pause`; destinație executabilă pentru trimitere warm pe **`q:email:warm`**.
- **Semantic (ADR-0002):** `e2:email:cold-campaign-pause` → `e2:email:warm-send` (catalog).
- **Planificare:** `email-warm-send` ca nod graf.

## Limite și reconcilieri

- Tripla autoritate cere separare clară între eticheta graf `email-warm-send` și coada BullMQ de trimitere; vezi contractele neuron `email--warm--send.md` și `q--email--warm.md`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-cold-campaign-pause-email-warm-send\``.
