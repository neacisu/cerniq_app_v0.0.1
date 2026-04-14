# Sinapsă `enrich-anif-ouai-lookup-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-anif-ouai-lookup-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-anif-ouai-lookup/enrich-anif-ouai-lookup-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-anif-ouai-lookup` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-anif-ouai-lookup` | **v2 / Matrix:** `enrich:anif:ouai-lookup`. **Contract:** [`../../../neurons/E1/enrich--anif--ouai-lookup.md`](../../../neurons/E1/enrich--anif--ouai-lookup.md). **Runtime (ADR-0001):** execuție documentată pe **`agri:ouai`** (`AGRI_OUAI` în `workers/shared/src/queue-registry.ts`) — **nu** literalul `enrich:anif:ouai-lookup` ca nume de coadă; reconciliere obligatorie în contractul neuron. |
| Destinație (graf) | `e1-enrichment` | Nod **agregat** de planificare pentru familia **enrichment** E1; nu este o singură coadă BullMQ. **ADR:** [`../../../../adr/families/e1/enrichment.md`](../../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul **lookup OUAI / ANIF (etichetă graf)** sub **`e1-enrichment`**. v2: **„specializează familia”** — fără payload sau ordine operațională în câmpurile sinapsei. În fluxul real, apartenența la OUAI este tratată pe coada **`agri:ouai`**, nu prin numele cozii din exportul v2 — vezi neuron.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime:** `e1:agri:ouai` / **`agri:ouai`** — catalog + registry (vezi neuron).
- **Semantic (ADR-0002):** `e1:agri:ouai` vs etichetă v2 `enrich:anif:ouai-lookup`.
- **Planificare:** `enrich-anif-ouai-lookup` → `e1-enrichment`.

## Limite și reconcilieri

- **ANIF** ca flux separat (`scrape:legal:anif`) nu echivalează acest traseu — vezi contract neuron.
- **`e1-enrichment`** rămâne agregat; pentru neuroni concreți, [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-anif-ouai-lookup-family\``.
