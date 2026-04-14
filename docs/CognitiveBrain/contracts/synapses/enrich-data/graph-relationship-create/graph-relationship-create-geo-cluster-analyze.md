# Sinapsă `graph-relationship-create-geo-cluster-analyze`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-relationship-create-geo-cluster-analyze` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-relationship-create/graph-relationship-create-geo-cluster-analyze.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-relationship-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `graph-relationship-create` | **Contract:** [`../../../neurons/E5/graph--relationship--create.md`](../../../neurons/E5/graph--relationship--create.md). **Runtime (ADR-0001):** vezi neuron — **`graph:build:relationships`**, nu literal v2 `graph:relationship:create`. |
| Destinație (graf) | `geo-cluster-analyze` | **Contract:** [`../../../neurons/E5/geo--cluster--analyze.md`](../../../neurons/E5/geo--cluster--analyze.md). E5 **graph-community** — vezi [`../../../../adr/families/e5/graph-community.md`](../../../../adr/families/e5/graph-community.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **graph-relationship-create** are dependență sintactică față de **geo-cluster-analyze**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `graph-relationship-create` → `geo-cluster-analyze`.
- **Runtime (ADR-0001):** ambele capete E5 — vezi contractele neuronilor și registry.
- **Semantic (ADR-0002):** etapa E5 — vezi catalog pentru `nodeKey`-urile concrete.

## Limite și reconcilieri

- **Sursă:** reconciliere obligatorie între eticheta v2 și numele cozii runtime — vezi neuronul sursă.
- Muchia **nu** dovedește singură că execuția geo urmează imediat crearea de relații; doar structura grafului de planificare.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-relationship-create-geo-cluster-analyze\``.
