# Sinapsă `ai-agent-orchestrate-negotiation-expire-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-agent-orchestrate-negotiation-expire-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-orchestrate/ai-agent-orchestrate-negotiation-expire-check.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-agent-orchestrate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `ai-agent-orchestrate` | Coadă canonică **`ai:agent:orchestrate`** — [`../../../neurons/E3/ai--agent--orchestrate.md`](../../../neurons/E3/ai--agent--orchestrate.md). |
| Țintă | `negotiation-expire-check` | Coadă canonică **`negotiation:expire:check`** — [`../../../neurons/E3/negotiation--expire--check.md`](../../../neurons/E3/negotiation--expire--check.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Scop muchie (export-grounded)

În graful de planificare exportat, muchia **`dependency`** declară că pasul asociat nodului `ai-agent-orchestrate` este predecesorul pasului `negotiation-expire-check` (slug-uri din v2 §7). Aceasta fixează **ordinea și dependența de proiectare** între orchestrarea agentului și verificarea expirării negocierii; **nu** afirmă din registrul §7 mecanismul concret de scheduling BullMQ, payload-ul mesajului sau faptul că worker-ul care consumă `ai:agent:orchestrate` enfile-uiește direct `negotiation:expire:check`.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001, `workers/shared/src/queue-registry.ts`):** `QUEUES.E3_AI_AGENT_ORCHESTRATE` → `ai:agent:orchestrate`; `QUEUES.E3_NEGOTIATION_EXPIRE_CHECK` → `negotiation:expire:check` (ambele în blocul E3 AI Agent Core / Negotiation FSM, comentariu sursă plan FAZA 7d–7f).
- **Semantic (ADR-0002, `packages/shared/src/cognitive-node-catalog.ts`):** `e3:ai:agent-orchestrate` / `ai:agent:orchestrate` — „Orchestrare agent AI B2B — selecție tool-uri, planificare răspuns”; `e3:negotiation:expire-check` / `negotiation:expire:check` — „Detectare negocieri expirate și tranziție automată la starea EXPIRED” (AttentionNeuron, swimlane `negotiation-fsm`).
- **Planificare (graf exportat):** dependență `dependency` din v2 §7; reconciliere slug graf (`-`) vs nume cozi (`:`) obligatorie la trasabilitate operațională.
- **Matrice:** rânduri în [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) pentru ambele cozi, cu contracte [`../../../neurons/E3/ai--agent--orchestrate.md`](../../../neurons/E3/ai--agent--orchestrate.md) și [`../../../neurons/E3/negotiation--expire--check.md`](../../../neurons/E3/negotiation--expire--check.md).

## Limite și reconcilieri

- Etichetele din graf (`ai-agent-orchestrate`, `negotiation-expire-check`) folosesc convenția slug; cozile reale folosesc `:` — reconciliere obligatorie la implementare, fără presupuneri despre payload.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-agent-orchestrate-negotiation-expire-check\``.
