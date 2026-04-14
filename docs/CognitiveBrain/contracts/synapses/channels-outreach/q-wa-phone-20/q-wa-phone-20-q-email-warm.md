# Sinapsă `q-wa-phone-20-q-email-warm`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-wa-phone-20-q-email-warm` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-wa-phone-20/q-wa-phone-20-q-email-warm.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-wa-phone-20` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `q-wa-phone-20` | **Contract:** [`../../../neurons/E2/q--wa--phone_20.md`](../../../neurons/E2/q--wa--phone_20.md). **Runtime:** `q:wa:phone-20`. |
| Destinație (graf) | `q-email-warm` | **Contract:** [`../../../neurons/E2/q--email--warm.md`](../../../neurons/E2/q--email--warm.md). **Runtime (ADR-0001):** `q:email:warm`. **Semantic (ADR-0002):** `e2:email:warm-send`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **WA linia 20** depinde în planificare de **coada email warm** — legătură multi-canal. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie conținut sau condiții de eligibilitate lead.

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

- **Runtime (ADR-0001):** `q:wa:phone-20` și `q:email:warm`.
- **Semantic (ADR-0002):** guardrails warm în contract `q--email--warm.md`.
- **Planificare:** v2 §7 — `q-wa-phone-20` → `q-email-warm`.

## Limite și reconcilieri

- Fără completări despre timing WA → warm din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-wa-phone-20-q-email-warm\``.
