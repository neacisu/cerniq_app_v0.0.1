# Sinapsă `ai-agent-response-generate-negotiation-state-transition`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-agent-response-generate-negotiation-state-transition` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-response-generate/ai-agent-response-generate-negotiation-state-transition.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-agent-response-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-agent-response-generate` | **Planificare:** traseu `ai-agent-response-generate`. **Matrix:** `ai:agent:response-generate` → [`../../../neurons/E3/ai--agent--response-generate.md`](../../../neurons/E3/ai--agent--response-generate.md). **Runtime:** **`ai:e3:response:generate`**; vezi reconcilierea în contractul sursă. |
| Țintă | `negotiation-state-transition` | **Matrix:** `negotiation:state:transition` (E3, `negotiation`) → [`../../../neurons/E3/negotiation--state--transition.md`](../../../neurons/E3/negotiation--state--transition.md). **Registry:** `E3_NEGOTIATION_STATE_TRANSITION` → `negotiation:state:transition`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** indică în planificare că traseul `ai-agent-response-generate` precede sau este legat canonic de `negotiation-state-transition`. Descrierea v2 rămâne **„sinapsă canonică de pipeline”**; exportul nu spune ce eveniment de domeniu sau ce payload leagă finalizarea răspunsului de o tranziție de stare. Regulile de stare și handler-ul efectiv se citesc din contractul [`negotiation--state--transition.md`](../../../neurons/E3/negotiation--state--transition.md).

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

- **Runtime (ADR-0001):** ținta `negotiation:state:transition` conform registry și contractului neuron. Sursa: execuție pe **`ai:e3:response:generate`**, nu neapărat pe literalul `ai:agent:response-generate` din Matrix.
- **Semantic (ADR-0002):** `nodeKey` / swimlane — catalog + contracte.
- **Planificare:** dependență structurală în graf; nu echivală automat cu ordinea temporală strictă a joburilor în toate ramurile.

## Limite și reconcilieri

- Fără completări fictive despre payload sau idempotență muchie; v2 nu le exportă.
- Divergență slug graf vs cozi: doar prin Matrix și `queue-registry.ts`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-agent-response-generate-negotiation-state-transition\``.
