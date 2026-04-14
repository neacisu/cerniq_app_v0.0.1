# Sinapsă `q-wa-phone-xx-email-cold-lead-status`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-wa-phone-xx-email-cold-lead-status` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-wa-phone-xx/q-wa-phone-xx-email-cold-lead-status.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-wa-phone-xx` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `q-wa-phone-xx` | **Contract:** [`../../../neurons/E2/q--wa--phone_xx.md`](../../../neurons/E2/q--wa--phone_xx.md). **Runtime:** pattern `q:wa:phone-NN` — vezi contract neuron. |
| Destinație (graf) | `email-cold-lead-status` | **Contract:** [`../../../neurons/E2/email--cold--lead--status.md`](../../../neurons/E2/email--cold--lead--status.md). **Runtime / semantic:** vezi contract neuron + registry. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Procesarea WA pe linie** depinde în planificare de **actualizarea / citirea stării lead în fluxul cold email**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie maparea stărilor journey.

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

- **Runtime (ADR-0001):** vezi contracte + `queue-registry.ts`.
- **Semantic (ADR-0002):** vezi catalog pentru `email:cold:lead:status` dacă este nodeKey-ul auditat.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Muchia este structurală; lanțul efectiv WA ↔ lead status necesită verificare în cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-wa-phone-xx-email-cold-lead-status\``.
