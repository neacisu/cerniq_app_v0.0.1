# Sinapsă `email-cold-campaign-create-email-warm-proforma`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-cold-campaign-create-email-warm-proforma` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-cold-campaign-create/email-cold-campaign-create-email-warm-proforma.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-cold-campaign-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `email-cold-campaign-create` | **Contract:** [`../../../neurons/E2/email--cold--campaign--create.md`](../../../neurons/E2/email--cold--campaign--create.md). **Runtime:** `email:cold:campaign:create` — vezi contract neuron. |
| Destinație (graf) | `email-warm-proforma` | **Contract:** [`../../../neurons/E2/email--warm--proforma.md`](../../../neurons/E2/email--warm--proforma.md). **Runtime (ADR-0001):** `email:warm:proforma` (`QUEUES.EMAIL_WARM_PROFORMA`). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Crearea campaniei cold** depinde în planificare de **fluxul email warm proformă**. v2: **„sinapsă canonică de pipeline”**; exportul nu leagă explicit `campaign_id` de obiectul proformă.

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

- **Runtime (ADR-0001):** două cozi E2 distincte.
- **Semantic (ADR-0002):** vezi contracte neuron.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Muchia este structurală; implementarea nu este codificată în exportul v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-cold-campaign-create-email-warm-proforma\``.
