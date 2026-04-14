# Sinapsă `email-cold-lead-status-email-warm-document`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-cold-lead-status-email-warm-document` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-cold-lead-status/email-cold-lead-status-email-warm-document.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-cold-lead-status` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `email-cold-lead-status` | **Runtime:** **`email:cold:lead:status`** — [`../../../neurons/E2/email--cold--lead--status.md`](../../../neurons/E2/email--cold--lead--status.md); **Registry:** `EMAIL_COLD_LEAD_STATUS`. |
| Destinație | `email-warm-document` | **Runtime:** **`email:warm:document`** — [`../../../neurons/E2/email--warm--document.md`](../../../neurons/E2/email--warm--document.md); **Registry:** `EMAIL_WARM_DOCUMENT`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

Muchia **dependency** leagă în planificare **sincronizarea statusurilor lead cold** (evenimente / tracking la nivel de export) de traseul **`email-warm-document`**. **Dovadă muchie:** v2 §7. **Nedovedit de export:** payload, retry, safety, telemetrie. **Reconciliere semantică:** numele cozii warm „document” vs tracking în cod — contract neuron.

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

- **Runtime (ADR-0001):** `EMAIL_COLD_LEAD_STATUS` → `EMAIL_WARM_DOCUMENT`.
- **Semantic (ADR-0002):** `e2:email:cold-lead-status` → `e2:email:warm-document`.
- **Planificare:** noduri `email-cold-lead-status`, `email-warm-document`.

## Limite și reconcilieri

- Lanțul webhook → cold tracking → warm tracking este detaliat în contractele E2; muchia sinaptică nu îl înlocuiește.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-cold-lead-status-email-warm-document\``.
