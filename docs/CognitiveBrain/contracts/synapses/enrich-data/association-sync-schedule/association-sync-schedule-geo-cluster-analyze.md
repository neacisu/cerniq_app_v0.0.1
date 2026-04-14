# Sinapsă `association-sync-schedule-geo-cluster-analyze`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `association-sync-schedule-geo-cluster-analyze` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/association-sync-schedule/association-sync-schedule-geo-cluster-analyze.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `association-sync-schedule` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `association-sync-schedule` | **Contract:** [`../../../neurons/E5/association--sync--schedule.md`](../../../neurons/E5/association--sync--schedule.md). **Runtime:** vezi neuron — **fără** coadă cu literal v2 în registry la ultimul audit documentat. |
| Destinație (graf) | `geo-cluster-analyze` | **Contract (neuron):** [`../../../neurons/E5/geo--cluster--analyze.md`](../../../neurons/E5/geo--cluster--analyze.md). **Reconciliere:** slug graf `geo-cluster-analyze` ↔ runtime **`cluster:implicit:detect`** / `e5:cluster:implicit-detect` — explicit în contractul neuron, nu în exportul sinapsei. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **association-sync-schedule** depinde de pasul de **analiză cluster geo** (`geo-cluster-analyze`). v2: **„sinapsă canonică de pipeline”**; nu precizează conținut mesaj sau ordinea operațională între cozi.

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

- **Runtime (ADR-0001):** ținta efectivă este coada din contractul neuron geo-cluster (`cluster:implicit:detect`), nu slug-ul graf brut.
- **Semantic (ADR-0002):** vezi `e5:cluster:implicit-detect` în catalog — citat în neuron.
- **Planificare:** v2 §7 — `association-sync-schedule` → `geo-cluster-analyze`.

## Limite și reconcilieri

- Sursa `association-sync-schedule` are gap runtime documentat în neuron; muchia rămâne valabilă ca **topologie plan exportat**.
- Numele nodului țintă din graf trebuie dereferențiat prin [`../../../neurons/E5/geo--cluster--analyze.md`](../../../neurons/E5/geo--cluster--analyze.md) pentru execuție.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`association-sync-schedule-geo-cluster-analyze\``.
