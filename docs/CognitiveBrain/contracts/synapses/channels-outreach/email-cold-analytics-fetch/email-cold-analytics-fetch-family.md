# Sinapsă `email-cold-analytics-fetch-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-cold-analytics-fetch-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-cold-analytics-fetch/email-cold-analytics-fetch-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-cold-analytics-fetch` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `email-cold-analytics-fetch` | Traseu în graf; [`../../../neurons/E2/email--cold--analytics--fetch.md`](../../../neurons/E2/email--cold--analytics--fetch.md). **Runtime (ADR-0001):** `email:cold:analytics:fetch` (`QUEUES.EMAIL_COLD_ANALYTICS_FETCH`). **Semantic (ADR-0002):** `e2:email:cold-analytics`. |
| Destinație (graf) | `e2-email-cold` | Nod agregat **familie email-cold** E2; nu este o singură coadă executabilă; vezi ADR / catalog familie `email-cold`. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **fetch analytics campanie email cold** sub agregatul **`e2-email-cold`**. v2: **„specializează familia”** — fără payload în câmpurile sinapsei; modul concret de agregare (SQL vs API extern) este în contractul neuron și cod, nu în exportul muchiei.

## Sinapse dependență în același traseu

[`email-cold-analytics-fetch-email-warm-document.md`](email-cold-analytics-fetch-email-warm-document.md), [`email-cold-analytics-fetch-email-warm-proforma.md`](email-cold-analytics-fetch-email-warm-proforma.md), [`email-cold-analytics-fetch-email-warm-send.md`](email-cold-analytics-fetch-email-warm-send.md).

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

- **Runtime (ADR-0001):** coadă `email:cold:analytics:fetch` în registry — aliniată literal cu v2 la acest neuron.
- **Semantic (ADR-0002):** `e2:email:cold-analytics`.
- **Planificare:** v2 §7 — `email-cold-analytics-fetch` → `e2-email-cold`.

## Limite și reconcilieri

- Comportament procesor (agregări Postgres vs așteptări spec vechi Instantly) — vezi [`../../../neurons/E2/email--cold--analytics--fetch.md`](../../../neurons/E2/email--cold--analytics--fetch.md).
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-cold-analytics-fetch-family\``.
