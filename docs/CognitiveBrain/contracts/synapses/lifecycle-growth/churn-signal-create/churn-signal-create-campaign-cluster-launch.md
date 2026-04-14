# Sinapsă `churn-signal-create-campaign-cluster-launch`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `churn-signal-create-campaign-cluster-launch` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/churn-signal-create/churn-signal-create-campaign-cluster-launch.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `churn-signal-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `churn-signal-create` | **Contract:** [`../../../neurons/E5/churn--signal--create.md`](../../../neurons/E5/churn--signal--create.md). **Runtime (ADR-0001):** **`churn:signal:detect`** — vezi neuron (v2 `churn:signal:create`). |
| Destinație (graf) | `campaign-cluster-launch` | **Contract:** [`../../../neurons/E5/campaign--cluster--launch.md`](../../../neurons/E5/campaign--cluster--launch.md). E5 — vezi [`../../../../adr/families/e5/lifecycle.md`](../../../../adr/families/e5/lifecycle.md) dacă e relevant pentru context campanii. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **churn-signal-create** are dependență sintactică față de **campaign-cluster-launch**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `churn-signal-create` → `campaign-cluster-launch`.
- **Runtime (ADR-0001):** sursă — vezi reconcilierea create/detect; ținta — vezi contractul `campaign--cluster--launch.md` și registry.
- **Semantic (ADR-0002):** E5 — vezi `cognitive-node-catalog.ts` pentru `nodeKey`-uri.

## Limite și reconcilieri

- **Sursă:** nume v2 vs coadă BullMQ — vezi neuronul churn.
- Muchia nu implică singură lansarea unei campanii; doar structura dependențelor din graf.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`churn-signal-create-campaign-cluster-launch\``.
