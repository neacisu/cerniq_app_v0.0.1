# Sinapsă `email-cold-add-to-campaign-email-warm-proforma`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-cold-add-to-campaign-email-warm-proforma` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-cold-add-to-campaign/email-cold-add-to-campaign-email-warm-proforma.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-cold-add-to-campaign` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `email-cold-add-to-campaign` | **Contract:** [`../../../neurons/E2/email--cold--add-to-campaign.md`](../../../neurons/E2/email--cold--add-to-campaign.md). **Runtime:** `q:email:cold` — vezi contract neuron. |
| Destinație (graf) | `email-warm-proforma` | **Contract:** [`../../../neurons/E2/email--warm--proforma.md`](../../../neurons/E2/email--warm--proforma.md). **Runtime (ADR-0001):** `email:warm:proforma` (`QUEUES.EMAIL_WARM_PROFORMA`). **Semantic (ADR-0002):** vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Cold add-to-campaign** depinde în planificare de **fluxul email warm proformă**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie generarea PDF, semnături sau legătura cu fiscalul.

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

- **Runtime (ADR-0001):** `q:email:cold` vs `email:warm:proforma`.
- **Semantic (ADR-0002):** vezi contracte E2.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Muchia este structurală; detalii în contractele neuron, nu în sinapsă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-cold-add-to-campaign-email-warm-proforma\``.
