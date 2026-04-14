# Sinapsă `q-wa-phone-xx-email-cold-campaign-create`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-wa-phone-xx-email-cold-campaign-create` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-wa-phone-xx/q-wa-phone-xx-email-cold-campaign-create.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-wa-phone-xx` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `q-wa-phone-xx` | **Contract:** [`../../../neurons/E2/q--wa--phone_xx.md`](../../../neurons/E2/q--wa--phone_xx.md). **Runtime:** pattern `q:wa:phone-NN` — vezi contract neuron. |
| Destinație (graf) | `email-cold-campaign-create` | **Contract:** [`../../../neurons/E2/email--cold--campaign--create.md`](../../../neurons/E2/email--cold--campaign--create.md). **Runtime (ADR-0001):** `email:cold:campaign:create` (`QUEUES.EMAIL_COLD_CAMPAIGN_CREATE`). **Semantic (ADR-0002):** `e2:email:cold-campaign-create`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Fluxul WA per-linie** depinde în planificare de **crearea campaniei cold (Instantly)**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie ordinea: campanie înainte de outreach sau invers.

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

- **Runtime (ADR-0001):** cozi distincte — vezi registry.
- **Semantic (ADR-0002):** vezi contracte.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Muchia este structurală; cauzalitatea în product nu este codificată în exportul v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-wa-phone-xx-email-cold-campaign-create\``.
