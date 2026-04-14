# Sinapsă `email-cold-add-to-campaign-alert-internal-delivery-cluster`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-cold-add-to-campaign-alert-internal-delivery-cluster` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-cold-add-to-campaign/email-cold-add-to-campaign-alert-internal-delivery-cluster.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-cold-add-to-campaign` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `email-cold-add-to-campaign` | **Contract:** [`../../../neurons/E2/email--cold--add-to-campaign.md`](../../../neurons/E2/email--cold--add-to-campaign.md). **Runtime:** `q:email:cold` — vezi contract neuron. |
| Destinație (graf) | `alert-internal-delivery-cluster` | **Contract:** [`../../../neurons/E5/alert--internal--delivery-cluster.md`](../../../neurons/E5/alert--internal--delivery-cluster.md). **Runtime / semantic:** vezi contract neuron țintă. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Adăugarea în campanie cold** este legată în planificare de **alerta internă cluster livrări**. v2: **„sinapsă canonică de pipeline”**; exportul nu definește KPI sau praguri.

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

- **Runtime (ADR-0001):** vezi contracte + registry.
- **Semantic (ADR-0002):** E2 vs E5.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Muchia este structurală; implementarea detaliată nu este în exportul v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-cold-add-to-campaign-alert-internal-delivery-cluster\``.
