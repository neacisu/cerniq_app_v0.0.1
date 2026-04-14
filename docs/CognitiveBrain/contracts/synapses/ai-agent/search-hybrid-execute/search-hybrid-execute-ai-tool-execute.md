# Sinapsă `search-hybrid-execute-ai-tool-execute`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-hybrid-execute-ai-tool-execute` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-hybrid-execute/search-hybrid-execute-ai-tool-execute.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-hybrid-execute` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `search-hybrid-execute` | **Contract agregat:** [`../../../neurons/E3/search--hybrid--execute.md`](../../../neurons/E3/search--hybrid--execute.md). **Runtime:** fără coadă unică `search:hybrid:execute` în registry; orchestrare **B7–B10** (`search:query:rewrite`, `search:vector:execute`, `search:bm25:execute`, `search:rrf:fuse`). |
| Destinație (graf) | `ai-tool-execute` | **Matrix:** `ai:tool:execute` — [`../../../neurons/E3/ai--tool--execute.md`](../../../neurons/E3/ai--tool--execute.md). **Gap:** contractul neuron documentează absența cozii în registry și execuția tool prin C14 — **nu** echivalați graful cu worker dedicat fără reconciliere. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Căutarea hibridă (agregat planificare)** este legată canonic de **execuția tool-urilor** în planificare. v2: **„sinapsă canonică de pipeline”**; în repo, execuția poate fi înglobată în orchestrator, nu ca job `ai:tool:execute`.

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

- **Runtime (ADR-0001):** B7–B10 vs tool path — vezi contract țintă și C14.
- **Semantic (ADR-0002):** hybrid-search vs ai-core.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Pipeline-ul de căutare nu echivalează automat cu invocarea tool-urilor agentului.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-hybrid-execute-ai-tool-execute\``.
