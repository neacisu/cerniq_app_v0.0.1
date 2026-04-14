# Sinapsă `email-cold-campaign-create-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-cold-campaign-create-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-cold-campaign-create/email-cold-campaign-create-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-cold-campaign-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `email-cold-campaign-create` | Traseu în graf; [`../../../neurons/E2/email--cold--campaign--create.md`](../../../neurons/E2/email--cold--campaign--create.md). **Runtime (ADR-0001):** `email:cold:campaign:create` (`QUEUES.EMAIL_COLD_CAMPAIGN_CREATE`). **Semantic (ADR-0002):** `e2:email:cold-campaign-create`. |
| Destinație (graf) | `e2-email-cold` | Nod agregat **familie email-cold** E2; nu este o singură coadă executabilă; vezi ADR / catalog familie `email-cold`. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **creare campanie email cold (Instantly)** sub agregatul **`e2-email-cold`**. v2: **„specializează familia”** — fără payload în câmpurile sinapsei; `CreateCampaignRequest` și apelul API sunt în contractul neuron și cod.

## Sinapse dependență în același traseu

[`email-cold-campaign-create-email-warm-document.md`](email-cold-campaign-create-email-warm-document.md), [`email-cold-campaign-create-email-warm-proforma.md`](email-cold-campaign-create-email-warm-proforma.md), [`email-cold-campaign-create-email-warm-send.md`](email-cold-campaign-create-email-warm-send.md).

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime (ADR-0001):** coadă `email:cold:campaign:create` aliniată registry — vezi contract neuron.
- **Semantic (ADR-0002):** `e2:email:cold-campaign-create`.
- **Planificare:** v2 §7 — `email-cold-campaign-create` → `e2-email-cold`.

## Limite și reconcilieri

- Posibilă diferență concurrency worker vs metadate registry — notată în contract neuron; **nu** extinsă aici fără audit nou.
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-cold-campaign-create-family\``.
