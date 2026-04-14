# Sinapsă `email-cold-lead-status-email-warm-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-cold-lead-status-email-warm-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-cold-lead-status/email-cold-lead-status-email-warm-send.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-cold-lead-status` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `email-cold-lead-status` | **Runtime:** **`email:cold:lead:status`** — [`../../../neurons/E2/email--cold--lead--status.md`](../../../neurons/E2/email--cold--lead--status.md); **Registry:** `EMAIL_COLD_LEAD_STATUS`. |
| Destinație | `email-warm-send` | Nod graf trimitere warm; **runtime trimitere:** **`q:email:warm`** — [`../../../neurons/E2/email--warm--send.md`](../../../neurons/E2/email--warm--send.md), [`../../../neurons/E2/q--email--warm.md`](../../../neurons/E2/q--email--warm.md); **Registry:** `EMAIL_WARM`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

Muchia leagă **procesarea statusului lead cold** de traseul **`email-warm-send`** în graful de planificare. **Dovadă muchie:** v2 §7. **Nedovedit de export:** payload, retry, safety, telemetrie. **Reconciliere graf–registry:** `email-warm-send` (plan) ≡ **`q:email:warm`** (execuție trimitere), conform contractelor neuron.

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

- **Runtime (ADR-0001):** cold tracking → coadă warm de trimitere.
- **Semantic (ADR-0002):** `e2:email:cold-lead-status` → `e2:email:warm-send`.
- **Planificare:** respectă nodurile din export.

## Limite și reconcilieri

- Fără inferențe despre conținutul mesajelor sau despre momentul exact al trimiterii numai din această muchie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-cold-lead-status-email-warm-send\``.
