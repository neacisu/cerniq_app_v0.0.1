# Sinapsă `email-cold-campaign-pause-email-warm-proforma`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-cold-campaign-pause-email-warm-proforma` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-cold-campaign-pause/email-cold-campaign-pause-email-warm-proforma.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-cold-campaign-pause` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `email-cold-campaign-pause` | **Runtime:** **`email:cold:campaign:pause`** — [`../../../neurons/E2/email--cold--campaign--pause.md`](../../../neurons/E2/email--cold--campaign--pause.md); **Registry:** `EMAIL_COLD_CAMPAIGN_PAUSE`. |
| Destinație | `email-warm-proforma` | **Runtime:** **`email:warm:proforma`** — [`../../../neurons/E2/email--warm--proforma.md`](../../../neurons/E2/email--warm--proforma.md); **Registry:** `EMAIL_WARM_PROFORMA`. Semantica efectivă (reply pipeline etc.) este în contractul neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

Muchia **dependency** leagă în planificare nodul de **pauză campanie cold** de traseul **`email-warm-proforma`**, plasând ramura warm „proforma” după dependențele extrase din export. **Dovadă muchie:** v2 §7. **Nedovedit de export:** payload, retry, safety, telemetrie. **Reconciliere:** denumirea „proforma” vs pipeline-ul de răspuns în cod — vezi neuron.

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

- **Runtime (ADR-0001):** `EMAIL_COLD_CAMPAIGN_PAUSE` → `EMAIL_WARM_PROFORMA`.
- **Semantic (ADR-0002):** `e2:email:cold-campaign-pause` → `e2:email:warm-proforma`.
- **Planificare:** noduri graf `email-cold-campaign-pause`, `email-warm-proforma`.

## Limite și reconcilieri

- Ordinea efectivă a job-urilor în producție nu se deduce numai din această muchie; se validează în cod și în contractele neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-cold-campaign-pause-email-warm-proforma\``.
