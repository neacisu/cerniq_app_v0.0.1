# Sinapsă `geo-cluster-analyze-nurturing-state-transition`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `geo-cluster-analyze-nurturing-state-transition` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/geo-cluster-analyze/geo-cluster-analyze-nurturing-state-transition.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `geo-cluster-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `geo-cluster-analyze` | **Contract:** [`../../../neurons/E5/geo--cluster--analyze.md`](../../../neurons/E5/geo--cluster--analyze.md). **Runtime:** **`cluster:implicit:detect`** — vezi neuron față de `geo:cluster:analyze` din v2. |
| Destinație (graf) | `nurturing-state-transition` | **Contract:** [`../../../neurons/E2/nurturing--state--transition.md`](../../../neurons/E2/nurturing--state--transition.md). Context: [`../../../../adr/families/e2/lead-fsm.md`](../../../../adr/families/e2/lead-fsm.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **geo-cluster-analyze** are dependență sintactică față de **nurturing-state-transition**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `geo-cluster-analyze` → `nurturing-state-transition`.
- **Runtime / semantic:** ținta este **E2** cu coadă canonică **`lead:state:transition`** — vezi [`../../../neurons/E2/nurturing--state--transition.md`](../../../neurons/E2/nurturing--state--transition.md).

## Limite și reconcilieri

- Nod **nurturing-*** în graf vs etapă **E2** în execuție: documentat în contractul neuronului (inconsistențe v2 posibile); **nu** se completează din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`geo-cluster-analyze-nurturing-state-transition\``.
