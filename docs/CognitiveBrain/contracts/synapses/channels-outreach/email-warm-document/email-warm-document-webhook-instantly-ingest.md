# Sinapsă `email-warm-document-webhook-instantly-ingest`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-warm-document-webhook-instantly-ingest` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-warm-document/email-warm-document-webhook-instantly-ingest.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-warm-document` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `email-warm-document` | **Runtime:** **`email:warm:document`** — [`../../../neurons/E2/email--warm--document.md`](../../../neurons/E2/email--warm--document.md); **Registry:** `EMAIL_WARM_DOCUMENT`. |
| Destinație | `webhook-instantly-ingest` | **Runtime:** **`webhook:instantly:ingest`** — [`../../../neurons/E2/webhook--instantly--ingest.md`](../../../neurons/E2/webhook--instantly--ingest.md); **Registry:** `WEBHOOK_INSTANTLY_INGEST`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

În planificare, traseul **`email-warm-document`** este legat prin **dependency** de **`webhook-instantly-ingest`**: modelare DAG între coada / lane-ul warm „document” și ingest-ul evenimentelor Instantly. **Dovadă muchie:** v2 §7. **Nedovedit de export:** payload, retry, safety, telemetrie. **Context repo:** fluxul concret Instantly → cold tracking este documentat în contractul webhook; muchia sinaptică afirmă doar structura din export.

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

- **Runtime (ADR-0001):** `EMAIL_WARM_DOCUMENT` → `WEBHOOK_INSTANTLY_INGEST`.
- **Semantic (ADR-0002):** `e2:email:warm-document` → `e2:webhook:instantly` (vezi `NEURON_MATRIX.csv`).
- **Planificare:** noduri graf `email-warm-document`, `webhook-instantly-ingest`.

## Limite și reconcilieri

- Ordinea sau ciclul efectiv între warm tracking și webhook-uri se verifică în `workers/outreach`, nu se completează aici dacă lipsește din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-warm-document-webhook-instantly-ingest\``.
