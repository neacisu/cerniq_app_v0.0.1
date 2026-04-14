# Sinapsă `campaign-cluster-launch-content-drip-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `campaign-cluster-launch-content-drip-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/campaign-cluster-launch/campaign-cluster-launch-content-drip-send.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `campaign-cluster-launch` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `campaign-cluster-launch` | **Contract:** [`../../../neurons/E5/campaign--cluster--launch.md`](../../../neurons/E5/campaign--cluster--launch.md). **Runtime:** vezi contract neuron sursă (gap posibil). |
| Destinație (graf) | `content-drip-send` | **Contract:** [`../../../neurons/E5/content--drip--send.md`](../../../neurons/E5/content--drip--send.md). **Runtime (ADR-0001):** în registry, execuția drip este `content:drip:execute` (`QUEUES.E5_CONTENT_DRIP_EXECUTE`), nu literalul graf `content:drip:send` — vezi contract neuron și ADR familie `content`. **Semantic (ADR-0002):** `e5:content:drip-execute`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Lansarea clusterului** depinde în planificare de **execuția pasului drip** (trimitere conform planului). v2: **„sinapsă canonică de pipeline”**; exportul nu detaliază payload sau ordinea față de I48.

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

- **Runtime (ADR-0001):** **reconciliere obligatorie** nod graf `content-drip-send` vs coadă `content:drip:execute` — documentată în [`../../../neurons/E5/content--drip--send.md`](../../../neurons/E5/content--drip--send.md).
- **Semantic (ADR-0002):** `e5:content:drip-execute` pentru execuție.
- **Planificare:** muchie `dependency` conform v2.

## Limite și reconcilieri

- Eticheta din graf (**`content-drip-send`**) și numele cozii BullMQ (**`content:drip:execute`**) nu sunt identice; sinapsa urmează **nodurile din export**, iar runtime-ul se citește din contracte neuron + registry.
- Sursa `campaign-cluster-launch` poate fi neimplementată ca atare — vezi contract neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`campaign-cluster-launch-content-drip-send\``.
