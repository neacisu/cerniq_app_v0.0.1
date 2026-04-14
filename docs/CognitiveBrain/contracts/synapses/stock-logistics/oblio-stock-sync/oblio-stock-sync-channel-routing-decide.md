# Sinapsă `oblio-stock-sync-channel-routing-decide`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `oblio-stock-sync-channel-routing-decide` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/oblio-stock-sync/oblio-stock-sync-channel-routing-decide.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `oblio-stock-sync` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `oblio-stock-sync` | **Contract:** [`../../../neurons/E3/oblio--stock--sync.md`](../../../neurons/E3/oblio--stock--sync.md). **Triplă autoritate:** v2 `oblio:stock:sync`; **runtime:** vezi contract neuron. |
| Destinație (graf) | `channel-routing-decide` | **Contract:** [`../../../neurons/E3/channel--routing--decide.md`](../../../neurons/E3/channel--routing--decide.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **oblio-stock-sync** are dependență canonică de pipeline față de **channel-routing-decide**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `oblio-stock-sync` → `channel-routing-decide`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L141**; țintă `channel:routing:decide` la **L131** (`catalog_nodekey_v2` gol — vezi contract neuron).
- **Runtime:** vezi neuronii.

## Limite și reconcilieri

- Dependența este topologică; criteriile de rutare sunt în implementare.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`oblio-stock-sync-channel-routing-decide\``.
