# Sinapsă `campaign-cluster-launch-content-seasonal-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `campaign-cluster-launch-content-seasonal-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/campaign-cluster-launch/campaign-cluster-launch-content-seasonal-generate.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `campaign-cluster-launch` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `campaign-cluster-launch` | **Contract:** [`../../../neurons/E5/campaign--cluster--launch.md`](../../../neurons/E5/campaign--cluster--launch.md). **Runtime:** vezi contract neuron sursă. |
| Destinație (graf) | `content-seasonal-generate` | **Contract:** [`../../../neurons/E5/content--seasonal--generate.md`](../../../neurons/E5/content--seasonal--generate.md). **Runtime (ADR-0001):** v2 `content:seasonal:generate` **fără** literal în registry; contractul neuron citează **proximitate operațională** `alerts:apia:seasonal` / `e5:alert:apia-seasonal` (J54) — **nu** echivalență 1:1 cu generarea editorială din v2. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Lansarea clusterului** depinde în planificare de **generarea conținutului sezonier** (subsidii / mesaje APIA etc., conform neuronului). v2: **„sinapsă canonică de pipeline”**; exportul nu detaliează sezoane, eligibilitate sau payload.

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

- **Runtime (ADR-0001):** autoritatea pentru coadă este contractul neuron țintă + `queue-registry.ts`.
- **Semantic (ADR-0002):** vezi catalog în contract neuron.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Nu echivala automat nodul graf cu o coadă din registry fără [`../../../neurons/E5/content--seasonal--generate.md`](../../../neurons/E5/content--seasonal--generate.md).
- Sursa `campaign-cluster-launch` — posibil gap implementare; vezi contract.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`campaign-cluster-launch-content-seasonal-generate\``.
