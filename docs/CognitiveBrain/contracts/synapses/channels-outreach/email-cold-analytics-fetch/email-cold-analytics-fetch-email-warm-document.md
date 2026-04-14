# Sinapsă `email-cold-analytics-fetch-email-warm-document`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-cold-analytics-fetch-email-warm-document` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-cold-analytics-fetch/email-cold-analytics-fetch-email-warm-document.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-cold-analytics-fetch` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `email-cold-analytics-fetch` | **Contract:** [`../../../neurons/E2/email--cold--analytics--fetch.md`](../../../neurons/E2/email--cold--analytics--fetch.md). **Runtime:** `email:cold:analytics:fetch` — vezi contract neuron. |
| Destinație (graf) | `email-warm-document` | **Contract:** [`../../../neurons/E2/email--warm--document.md`](../../../neurons/E2/email--warm--document.md). **Runtime (ADR-0001):** `email:warm:document` (`QUEUES.EMAIL_WARM_DOCUMENT`). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Colectarea metricilor / rapoartelor cold analytics** depinde în planificare de **fluxul email warm document**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie cum analytics influențează documentele sau invers.

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

- **Runtime (ADR-0001):** `email:cold:analytics:fetch` vs `email:warm:document` — cozi distincte.
- **Semantic (ADR-0002):** ambele E2 — vezi contracte.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Muchia este structurală; datele partajate între job-uri nu sunt în exportul v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-cold-analytics-fetch-email-warm-document\``.
