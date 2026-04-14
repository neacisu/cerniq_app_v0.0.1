# Sinapsă `campaign-cluster-launch-content-personalize-ai`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `campaign-cluster-launch-content-personalize-ai` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/campaign-cluster-launch/campaign-cluster-launch-content-personalize-ai.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `campaign-cluster-launch` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `campaign-cluster-launch` | **Contract:** [`../../../neurons/E5/campaign--cluster--launch.md`](../../../neurons/E5/campaign--cluster--launch.md). **Runtime:** vezi contract neuron sursă. |
| Destinație (graf) | `content-personalize-ai` | **Contract:** [`../../../neurons/E5/content--personalize--ai.md`](../../../neurons/E5/content--personalize--ai.md). **Runtime (ADR-0001):** v2 `content:personalize:ai` **nu** are literal în registry; implementarea auditată este **`content:template:render`** (`E5_CONTENT_TEMPLATE_RENDER`) — vezi contract neuron (`coadă runtime`). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Lansarea clusterului** depinde în planificare de **personalizare conținut asistată (AI)**. v2: **„sinapsă canonică de pipeline”**; exportul nu specifică modele, prompturi sau structura payload.

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

- **Runtime (ADR-0001):** nod graf vs **`content:template:render`** + `e5:content:template-render` — vezi [`../../../neurons/E5/content--personalize--ai.md`](../../../neurons/E5/content--personalize--ai.md).
- **Semantic (ADR-0002):** `e5:content:template-render` (catalog — contract neuron).
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Orice diferență între eticheta nodului din graf și `nodeKey`/coadă din catalog se rezolvă în contractul neuron, nu prin completări ad-hoc în sinapsă.
- Sursa `campaign-cluster-launch` poate fi în gap față de registry — vezi contract.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`campaign-cluster-launch-content-personalize-ai\``.
