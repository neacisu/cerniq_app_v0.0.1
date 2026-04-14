# Sinapsă `email-warm-send-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-warm-send-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-warm-send/email-warm-send-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-warm-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `email-warm-send` | Nod graf pentru trimitere email warm; **runtime canonic (trimitere):** coada **`q:email:warm`** — [`../../../neurons/E2/email--warm--send.md`](../../../neurons/E2/email--warm--send.md), [`../../../neurons/E2/q--email--warm.md`](../../../neurons/E2/q--email--warm.md); **Registry:** `EMAIL_WARM`. **Nu** există cheie separată `email:warm:send` în registry. |
| Destinație (graf) | `e2-email-warm` | Agregat de planificare pentru familia **email-warm** (E2), nu o singură coadă BullMQ; fără fișier neuron unic pentru această etichetă de graf. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** ancorează traseul `email-warm-send` în nucleul **`e2-email-warm`**. Descrierea v2: **„specializează familia”**. Exportul nu fixează payload sau handler pentru această muchie de familie.

## Sinapse dependență în același traseu

[`email-warm-send-webhook-instantly-ingest.md`](email-warm-send-webhook-instantly-ingest.md), [`email-warm-send-webhook-resend-ingest.md`](email-warm-send-webhook-resend-ingest.md), [`email-warm-send-webhook-timelinesai-ingest.md`](email-warm-send-webhook-timelinesai-ingest.md) — muchii **dependency** (v2 §7).

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime (ADR-0001):** trimitere warm pe **`q:email:warm`** — vezi registry.
- **Semantic (ADR-0002):** `e2:email:warm-send` (catalog) — vezi `NEURON_MATRIX.csv` / contracte neuron.
- **Planificare:** `email-warm-send` ca nod graf; **`e2-email-warm`** = agregat.

## Limite și reconcilieri

- Reconcilierea **`email-warm-send` (graf) ↔ `q:email:warm` (coadă)** este obligatorie pentru cititori; detalii în `email--warm--send.md`.
- Nu inventa payload / retry / safety / telemetrie din afara v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-warm-send-family\``.
