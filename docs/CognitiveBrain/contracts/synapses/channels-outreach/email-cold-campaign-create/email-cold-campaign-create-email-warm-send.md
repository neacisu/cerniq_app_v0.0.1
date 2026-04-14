# Sinapsă `email-cold-campaign-create-email-warm-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-cold-campaign-create-email-warm-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-cold-campaign-create/email-cold-campaign-create-email-warm-send.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-cold-campaign-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `email-cold-campaign-create` | **Contract:** [`../../../neurons/E2/email--cold--campaign--create.md`](../../../neurons/E2/email--cold--campaign--create.md). **Runtime:** `email:cold:campaign:create` — vezi contract neuron. |
| Destinație (graf) | `email-warm-send` | **Contract:** [`../../../neurons/E2/email--warm--send.md`](../../../neurons/E2/email--warm--send.md). **Runtime (ADR-0001):** v2 `email:warm:send` operațional **`q:email:warm`** — vezi contract neuron. **Semantic (ADR-0002):** `e2:email:warm-send`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Crearea campaniei cold** depinde în planificare de **trimiterea emailului warm**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie dependența logică (ex. warm înainte de outbound cold).

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

- **Runtime (ADR-0001):** `email:cold:campaign:create` vs **`q:email:warm`** — vezi [`../../../neurons/E2/email--warm--send.md`](../../../neurons/E2/email--warm--send.md).
- **Semantic (ADR-0002):** `e2:email:cold-campaign-create` și `e2:email:warm-send`.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Muchia este structurală; nu presupune același flux de date între capete.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-cold-campaign-create-email-warm-send\``.
