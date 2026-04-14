# Sinapsă `ai-prompt-optimize-negotiation-reminder-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-prompt-optimize-negotiation-reminder-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-prompt-optimize/ai-prompt-optimize-negotiation-reminder-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-prompt-optimize` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-prompt-optimize` | **Planificare:** traseu `ai-prompt-optimize`. **Matrix:** `ai:prompt:optimize` → [`../../../neurons/E3/ai--prompt--optimize.md`](../../../neurons/E3/ai--prompt--optimize.md). **Gap runtime** pentru coada nominală: vezi contractul neuron; reconciliere obligatorie înainte de a trata sursa ca executabilă ADR-0001. |
| Destinație (graf) | `negotiation-reminder-send` | **Registry:** `E3_NEGOTIATION_REMINDER_SEND` → `negotiation:reminder:send`. **Contract:** [`../../../neurons/E3/negotiation--reminder--send.md`](../../../neurons/E3/negotiation--reminder--send.md). **Matrix:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv). **Catalog:** `negotiation:reminder:send` / `e3:negotiation:reminder-send`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** leagă declarativ `ai-prompt-optimize` de `negotiation-reminder-send`. Descrierea v2 este generică; exportul **nu** precizează cum ar circula contextul între optimizarea promptului și memento-urile de negociere. Detalii în contractele neuron, nu în sinapsa v2.

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

- **Runtime (ADR-0001):** ținta în registry; sursa — gap documentat în contractul neuron `ai:prompt:optimize`.
- **Semantic (ADR-0002):** ținta conform catalog; sursă fără `nodeKey` catalogat la auditul citit.
- **Planificare:** dependență declarată între optimizarea promptului și trimiterea memento-ului de negociere.

## Limite și reconcilieri

- Slug-uri vs cozi — mapare explicită; fără presupuneri despre mesaje.
- Lipsa workerului sursă în registry nu anulează muchia din graf; separă **plan** de **execuție dovedită**.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-prompt-optimize-negotiation-reminder-send\``.
