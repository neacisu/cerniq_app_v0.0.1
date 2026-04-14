# Sinapsă `q-wa-phone-email-cold-lead-status`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-wa-phone-email-cold-lead-status` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-wa-phone/q-wa-phone-email-cold-lead-status.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-wa-phone` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `q-wa-phone` | **Contract:** [`../../../neurons/E2/q--wa--phone_.md`](../../../neurons/E2/q--wa--phone_.md). **Runtime:** cozi `q:wa:phone-NN` — vezi contract. |
| Destinație (graf) | `email-cold-lead-status` | **Contract:** [`../../../neurons/E2/email--cold--lead--status.md`](../../../neurons/E2/email--cold--lead--status.md). **Semantic (ADR-0002):** `e2:email:cold-lead-status`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **WA generic** depinde în planificare de **actualizare / citire status lead** în subgraful cold email — aliniere stări între mesagerie și outreach email. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie câmpuri status sau sursa de adevăr.

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

- **Runtime (ADR-0001):** vezi contract neuron țintă.
- **Semantic (ADR-0002):** integrare date lead între WA și cold email.
- **Planificare:** v2 §7 — `q-wa-phone` → `email-cold-lead-status`.

## Limite și reconcilieri

- Fără presupuneri despre consistență eventuală sau conflicte de scriere între canale — doar muchia din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-wa-phone-email-cold-lead-status\``.
