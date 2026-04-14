# Sinapsă `feedback-conversation-analyze-churn-sentiment-analyze`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `feedback-conversation-analyze-churn-sentiment-analyze` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/feedback-conversation-analyze/feedback-conversation-analyze-churn-sentiment-analyze.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `feedback-conversation-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `feedback-conversation-analyze` | **Contract:** [`../../../neurons/E5/feedback--conversation--analyze.md`](../../../neurons/E5/feedback--conversation--analyze.md). **Triplă:** v2 `feedback:conversation:analyze` — vezi neuron pentru mapare registry. |
| Destinație (graf) | `churn-sentiment-analyze` | **Contract:** [`../../../neurons/E2/churn--sentiment--analyze.md`](../../../neurons/E2/churn--sentiment--analyze.md). **Notă:** v2 plasează neuronul în **E2**; coada operațională din neuron este **`ai:sentiment:analyze`** — vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **feedback-conversation-analyze** are dependență sintactică față de **churn-sentiment-analyze**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `feedback-conversation-analyze` → `churn-sentiment-analyze`.
- **Runtime (ADR-0001) / Semantic (ADR-0002):** ținta — **cross-etapă** (E2 în contract neuron); reconciliere doar din neuron și registry.

## Limite și reconcilieri

- Muchia exprimă doar structura grafului exportat.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`feedback-conversation-analyze-churn-sentiment-analyze\`` (L21785–L21796).
