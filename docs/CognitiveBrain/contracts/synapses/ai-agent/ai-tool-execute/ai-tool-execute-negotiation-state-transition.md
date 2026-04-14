# Sinapsă `ai-tool-execute-negotiation-state-transition`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-tool-execute-negotiation-state-transition` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-tool-execute/ai-tool-execute-negotiation-state-transition.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-tool-execute` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-tool-execute` | **Planificare:** traseu `ai-tool-execute`. **Matrix:** `ai:tool:execute` → [`../../../neurons/E3/ai--tool--execute.md`](../../../neurons/E3/ai--tool--execute.md). **Neconciliat** cu handler/coadă dedicată în registry la audit; vezi C14 în contractul neuron. |
| Țintă | `negotiation-state-transition` | **Matrix:** `negotiation:state:transition` → [`../../../neurons/E3/negotiation--state--transition.md`](../../../neurons/E3/negotiation--state--transition.md). **Registry:** `E3_NEGOTIATION_STATE_TRANSITION` → `negotiation:state:transition`. **Catalog:** perechi din contractul neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia declară că execuția tool (traseul `ai-tool-execute`) stă în relație canonică de pipeline cu tranzițiile de stare ale negocierii. v2 dă doar **„sinapsă canonică de pipeline”** — fără stări FSM sau evenimente în export. Semantica tranzițiilor este în contractul [`negotiation--state--transition.md`](../../../neurons/E3/negotiation--state--transition.md) și în cod, nu în câmpurile sinapsei.

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

- **Runtime (ADR-0001):** ținta documentată cu registry; sursa: gap pentru `ai:tool:execute` — [`ai--tool--execute.md`](../../../neurons/E3/ai--tool--execute.md).
- **Semantic (ADR-0002):** catalog pentru `negotiation:state:transition`; sursă fără potrivire catalog la audit.
- **Planificare:** dependență în graf — nu implică automat același proces sau aceeași coadă sursă în runtime.

## Limite și reconcilieri

- Fără enumerare de stări sau payload din presupuneri; doar v2 §7 + contracte neuron.
- Dacă tool-urile sunt executate în lanțul C14/C15 fără coadă `ai:tool:execute`, muchia rămâne **planificare**, nu dovadă de nume de job sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-tool-execute-negotiation-state-transition\``.
