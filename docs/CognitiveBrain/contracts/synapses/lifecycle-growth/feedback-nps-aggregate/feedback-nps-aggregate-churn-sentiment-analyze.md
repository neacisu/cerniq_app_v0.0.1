# Sinapsă `feedback-nps-aggregate-churn-sentiment-analyze`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `feedback-nps-aggregate-churn-sentiment-analyze` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/feedback-nps-aggregate/feedback-nps-aggregate-churn-sentiment-analyze.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `feedback-nps-aggregate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `feedback-nps-aggregate` | **Contract:** [`../../../neurons/E5/feedback--nps--aggregate.md`](../../../neurons/E5/feedback--nps--aggregate.md). **Runtime:** **`feedback:report:generate`** (mapare principală în repo) — vezi neuron față de `feedback:nps:aggregate` din v2. |
| Destinație (graf) | `churn-sentiment-analyze` | **Contract:** [`../../../neurons/E2/churn--sentiment--analyze.md`](../../../neurons/E2/churn--sentiment--analyze.md). Context: [`../../../../adr/families/e5/churn.md`](../../../../adr/families/e5/churn.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **feedback-nps-aggregate** are dependență sintactică față de **churn-sentiment-analyze**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `feedback-nps-aggregate` → `churn-sentiment-analyze`.
- **Runtime / semantic:** ținta este catalogată ca **E2** în contractul neuronului — vezi [`../../../neurons/E2/churn--sentiment--analyze.md`](../../../neurons/E2/churn--sentiment--analyze.md).

## Limite și reconcilieri

- Etapa **E2** pentru destinație vs traseu **lifecycle-growth** / sursă **E5**: reconciliere prin contracte neuron, fără inferențe suplimentare din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`feedback-nps-aggregate-churn-sentiment-analyze\``.
