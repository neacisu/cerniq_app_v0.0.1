# Sinapsă `referral-reward-process-content-drip-schedule`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `referral-reward-process-content-drip-schedule` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/referral-reward-process/referral-reward-process-content-drip-schedule.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `referral-reward-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `referral-reward-process` | **Contract:** [`../../../neurons/E5/referral--reward--process.md`](../../../neurons/E5/referral--reward--process.md). **Runtime:** `referral:reward:issue` → `referral:reward:notify` (E30/E31) — vezi neuron. |
| Destinație (graf) | `content-drip-schedule` | **Contract:** [`../../../neurons/E5/content--drip--schedule.md`](../../../neurons/E5/content--drip--schedule.md). ADR: [`../../../../adr/families/e5/content.md`](../../../../adr/families/e5/content.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **referral-reward-process** are dependență sintactică față de **content-drip-schedule**. v2: **sinapsă canonică de pipeline**; exportul **nu** fixează payload sau ordinea operațională între job-uri.

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

- **Planificare:** v2 §7 — `referral-reward-process` → `content-drip-schedule`.
- **Runtime:** sursă — lanț E30/E31; țintă — vezi neuron `content-drip-schedule`.

## Limite și reconcilieri

- Slug graf **referral-reward-process** agregă două cozi runtime; nu presupunem care worker emite mesajul către `content-drip-schedule` fără citire codului consumator.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`referral-reward-process-content-drip-schedule\``.
