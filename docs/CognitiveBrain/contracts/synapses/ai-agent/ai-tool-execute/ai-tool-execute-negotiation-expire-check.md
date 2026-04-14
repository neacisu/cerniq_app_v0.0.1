# Sinapsă `ai-tool-execute-negotiation-expire-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-tool-execute-negotiation-expire-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-tool-execute/ai-tool-execute-negotiation-expire-check.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-tool-execute` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-tool-execute` | **Planificare:** traseu `ai-tool-execute`. **Matrix:** `ai:tool:execute` → [`../../../neurons/E3/ai--tool--execute.md`](../../../neurons/E3/ai--tool--execute.md). **Gap registry/handler** pentru coada literală la audit; parsare/execuție tool în fluxul C14 — nu interpreta „sursa” ca job BullMQ `ai:tool:execute` fără reconciliere. |
| Țintă | `negotiation-expire-check` | **Matrix:** `negotiation:expire:check` → [`../../../neurons/E3/negotiation--expire--check.md`](../../../neurons/E3/negotiation--expire--check.md). **Registry:** `E3_NEGOTIATION_EXPIRE_CHECK` → `negotiation:expire:check`. **Catalog:** `negotiation:expire:check` / `e3:negotiation:expire-check` (vezi contract neuron). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** plasează în graf traseul de execuție tool în relație canonică cu `negotiation-expire-check`. Descrierea v2 este **„sinapsă canonică de pipeline”** — fără detaliu despre date sau ordinea scheduler-ului. În cod, neuronul țintă (D23) verifică TTL și enfilează abandon — vezi contractul țintă; legătura cu „tool execute” din v2 nu este expusă ca payload în export.

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

- **Runtime (ADR-0001):** ținta este documentată cu registry + worker în contractul neuron; sursa rămâne cu **gap** față de registry — vezi [`ai--tool--execute.md`](../../../neurons/E3/ai--tool--execute.md).
- **Semantic (ADR-0002):** pentru țintă, perechi din catalog; pentru sursă, lipsă potrivire la auditul din contract neuron.
- **Planificare:** dependență structurală în graf, distinctă de „același mesaj de coadă” între capete.

## Limite și reconcilieri

- Slug-uri graf vs cozi cu `:` — mapare prin Matrix + contracte.
- Dacă în producție nu există coadă `ai:tool:execute`, muchia rămâne utilă pentru **trasabilitate planificare → neuroni negociere**.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-tool-execute-negotiation-expire-check\``.
