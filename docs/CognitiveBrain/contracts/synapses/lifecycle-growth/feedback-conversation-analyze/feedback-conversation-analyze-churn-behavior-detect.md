# Sinapsă `feedback-conversation-analyze-churn-behavior-detect`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `feedback-conversation-analyze-churn-behavior-detect` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/feedback-conversation-analyze/feedback-conversation-analyze-churn-behavior-detect.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `feedback-conversation-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `feedback-conversation-analyze` | **Contract:** [`../../../neurons/E5/feedback--conversation--analyze.md`](../../../neurons/E5/feedback--conversation--analyze.md). **Triplă:** v2 `feedback:conversation:analyze` — vezi neuron pentru mapare registry. |
| Destinație (graf) | `churn-behavior-detect` | **Contract:** [`../../../neurons/E5/churn--behavior--detect.md`](../../../neurons/E5/churn--behavior--detect.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **feedback-conversation-analyze** are dependență sintactică față de **churn-behavior-detect**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `feedback-conversation-analyze` → `churn-behavior-detect`.
- **Runtime (ADR-0001) / Semantic (ADR-0002):** vezi contractele neuron.

## Limite și reconcilieri

- Muchia exprimă doar structura grafului exportat.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`feedback-conversation-analyze-churn-behavior-detect\`` (L21746–L21757).
