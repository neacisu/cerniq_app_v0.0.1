# Sinapsă `ai-agent-response-generate-negotiation-reminder-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-agent-response-generate-negotiation-reminder-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-response-generate/ai-agent-response-generate-negotiation-reminder-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-agent-response-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-agent-response-generate` | **Planificare:** traseu `ai-agent-response-generate`. **Matrix:** `ai:agent:response-generate` → [`../../../neurons/E3/ai--agent--response-generate.md`](../../../neurons/E3/ai--agent--response-generate.md). **Runtime:** **`ai:e3:response:generate`**; literalul Matrix/v2 diferă — vezi contractul sursă. |
| ��intă | `negotiation-reminder-send` | **Matrix:** `negotiation:reminder:send` (E3, `negotiation`) → [`../../../neurons/E3/negotiation--reminder--send.md`](../../../neurons/E3/negotiation--reminder--send.md). **Registry:** `E3_NEGOTIATION_REMINDER_SEND` → `negotiation:reminder:send`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** plasează `negotiation-reminder-send` în dependență canonică față de traseul `ai-agent-response-generate` în graful exportat. v2 confirmă doar formula **„sinapsă canonică de pipeline”**; nu există în export schema de mesaj sau semantica exactă a declanșării reminderelor față de pasul de răspuns. Comportamentul operațional al neuronului țintă (dacă este implementat) trebuie citit din contractul [`negotiation--reminder--send.md`](../../../neurons/E3/negotiation--reminder--send.md), nu dedus din muchie.

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

- **Runtime (ADR-0001, `workers/shared/src/queue-registry.ts`):** ținta mapată la `negotiation:reminder:send` dacă registry-ul și contractul neuron o confirmă. Sursa: **`ai:e3:response:generate`** pentru execuție E3, cu reconciliere față de etichetele graf/Matrix.
- **Semantic (ADR-0002, `packages/shared/src/cognitive-node-catalog.ts`):** `nodeKey` / swimlane pentru ambele capete — din catalog + contracte neuron.
- **Planificare:** dependență declarată între generarea răspunsului agent (în sens de traseu planificat) și trimiterea mesajelor de reamintire (reminder) în fluxul de negociere.

## Limite și reconcilieri

- Fără invenție payload/retry/safety/telemetrie peste textul v2.
- Orice gap în contractul neuron țintă rămâne **explicit** acolo; muchia sinaptică nu îl „rezolvă”.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-agent-response-generate-negotiation-reminder-send\``.
