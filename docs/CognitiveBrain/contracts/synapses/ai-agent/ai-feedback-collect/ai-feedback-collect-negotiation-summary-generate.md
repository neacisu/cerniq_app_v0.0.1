# Sinapsă `ai-feedback-collect-negotiation-summary-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-feedback-collect-negotiation-summary-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-feedback-collect/ai-feedback-collect-negotiation-summary-generate.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-feedback-collect` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `ai-feedback-collect` | **Execuție:** coadă **`feedback:collect`** (`QUEUES.E3_FEEDBACK_COLLECT`). Slug graf / câmpuri v2: `ai-feedback-collect` / `ai:feedback:collect` — [`../../../neurons/E3/ai--feedback--collect.md`](../../../neurons/E3/ai--feedback--collect.md). |
| Destinatie (graf) | `negotiation-summary-generate` | Nodul din graf corespunde contractului [`../../../neurons/E3/negotiation--summary--generate.md`](../../../neurons/E3/negotiation--summary--generate.md). Acel contract notează **gap runtime** (coada `negotiation:summary:generate` negăsită în `queue-registry.ts` / catalog la audit). **Necesită reconciliere graf ↔ registry** înainte de a afirma execuție echivalentă slug-ului. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime:** sursa este ancorată în `QUEUES.E3_FEEDBACK_COLLECT` / worker K65 (vezi contract neuron sursă). **Capătul țintă** nu are încă ancoră executabilă dovedită în registry la data contractului neuron — păstrați distincția între **nod planificat** și **coadă înregistrată**.
- **Semantic:** pentru sursă, `cognitive-node-catalog.ts` + contract; pentru țintă, catalog/registry lipsă în evidența din contractul neuron — **nu** inventați `nodeKey`.
- **Planificare:** muchie **`dependency`**: în graful exportat, `ai-feedback-collect` precede `negotiation-summary-generate`.

## Limite și reconcilieri

- Slug sursă ↔ **`feedback:collect`**. Pentru `negotiation-summary-generate` / `negotiation:summary:generate`: **gap explicit** față de implementare runtime documentat în contractul neuron; orice mapare viitoare trebuie dovedită în cod, nu presupusă din sinapsă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-feedback-collect-negotiation-summary-generate\``.
