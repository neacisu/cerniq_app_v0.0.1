# Sinapsă `q-wa-phone-email-cold-campaign-pause`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-wa-phone-email-cold-campaign-pause` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-wa-phone/q-wa-phone-email-cold-campaign-pause.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-wa-phone` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `q-wa-phone` | **Contract:** [`../../../neurons/E2/q--wa--phone_.md`](../../../neurons/E2/q--wa--phone_.md). **Runtime:** cozi `q:wa:phone-NN` — vezi contract. |
| Destinație (graf) | `email-cold-campaign-pause` | **Contract:** [`../../../neurons/E2/email--cold--campaign--pause.md`](../../../neurons/E2/email--cold--campaign--pause.md). **Semantic (ADR-0002):** `e2:email:cold-campaign-pause`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **WA generic** depinde în planificare de **pauzarea campaniei cold email** (control flux multi-canal, ex. oprire email când strategia WA se schimbă). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie motive de pauză sau policy.

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

- **Runtime (ADR-0001):** vezi contract neuron țintă pentru mapare coadă.
- **Semantic (ADR-0002):** legătură planificată între familia WA și control campanie email.
- **Planificare:** v2 §7 — `q-wa-phone` → `email-cold-campaign-pause`.

## Limite și reconcilieri

- Sensul cauzal operațional (WA declanșează pauză vs. pauză este precondiție pentru WA) **nu** este encodat în câmpurile sinapsei — doar dependența `dependency`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-wa-phone-email-cold-campaign-pause\``.
