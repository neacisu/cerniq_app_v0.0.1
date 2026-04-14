# Sinapsă `campaign-cluster-launch-email-cold-add-to-campaign`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `campaign-cluster-launch-email-cold-add-to-campaign` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/campaign-cluster-launch/campaign-cluster-launch-email-cold-add-to-campaign.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `campaign-cluster-launch` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `campaign-cluster-launch` | **Contract:** [`../../../neurons/E5/campaign--cluster--launch.md`](../../../neurons/E5/campaign--cluster--launch.md). **Runtime:** vezi contract neuron sursă (gap posibil). |
| Destinație (graf) | `email-cold-add-to-campaign` | **Contract:** [`../../../neurons/E2/email--cold--add-to-campaign.md`](../../../neurons/E2/email--cold--add-to-campaign.md). **Runtime (ADR-0001):** operațional `q:email:cold` (`QUEUES.EMAIL_COLD`), nu literalul v2 `email:cold:add-to-campaign` — vezi contract neuron. **Semantic (ADR-0002):** `e2:email:cold-send`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Lansarea clusterului de campanie** depinde în planificare de **adăugarea lead-urilor în campania cold email** (subgraf outreach). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie `campaign_id`, câmpuri lead sau apeluri Instantly.

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

- **Runtime (ADR-0001):** reconciliere graf `email-cold-add-to-campaign` vs `q:email:cold` — obligatoriu citit din contract neuron.
- **Semantic (ADR-0002):** E5 (sursă planificată) → E2 motor cold email.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Fără dovezi din sinapsă despre cine enfilează `q:email:cold` după „cluster launch” — doar structura grafului v2.
- Sursa `campaign-cluster-launch` poate fi neconectată la runtime — vezi contract neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`campaign-cluster-launch-email-cold-add-to-campaign\``.
