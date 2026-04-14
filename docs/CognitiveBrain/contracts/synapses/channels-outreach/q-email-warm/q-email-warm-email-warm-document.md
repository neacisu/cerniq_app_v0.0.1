# Sinapsă `q-email-warm-email-warm-document`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-email-warm-email-warm-document` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-email-warm/q-email-warm-email-warm-document.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-email-warm` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `q-email-warm` | **Contract:** [`../../../neurons/E2/q--email--warm.md`](../../../neurons/E2/q--email--warm.md). **Runtime (ADR-0001):** `q:email:warm` (`QUEUES.EMAIL_WARM`). |
| Destinație (graf) | `email-warm-document` | **Contract:** [`../../../neurons/E2/email--warm--document.md`](../../../neurons/E2/email--warm--document.md). **Runtime (ADR-0001):** `QUEUES.EMAIL_WARM_DOCUMENT` → literal `email:warm:document` în `queue-registry.ts`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **coadă email warm** depinde de **documentarea / pipeline-ul document** asociat canalului warm. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie ID document, payload sau ordinea job-urilor între cozi.

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

- **Runtime (ADR-0001):** două cozi distincte în registry — vezi contractele neuron sursă și țintă.
- **Semantic (ADR-0002):** `e2:email:warm-send` (sursă canonică trimitere) și `e2:email:warm-document` / `email:warm:document` pentru țintă — vezi catalog.
- **Planificare:** dependență declarativă `q-email-warm` → `email-warm-document`.

## Limite și reconcilieri

- Nu se deduce din sinapsă dacă fiecare mesaj warm trece obligatoriu prin coada document sau doar în anumite ramuri — doar structura grafului v2.
- Fără completări despre conținut document sau SLA.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-email-warm-email-warm-document\``.
