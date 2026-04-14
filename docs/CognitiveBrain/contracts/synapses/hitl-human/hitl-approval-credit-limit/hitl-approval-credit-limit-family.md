# Sinapsă `hitl-approval-credit-limit-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `hitl-approval-credit-limit-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/hitl-approval-credit-limit/hitl-approval-credit-limit-family.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `hitl-approval-credit-limit` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `hitl-approval-credit-limit` | Traseu în graf; contract neuron: [`../../../neurons/E4/hitl--approval--credit-limit.md`](../../../neurons/E4/hitl--approval--credit-limit.md). **Triplă autoritate:** v2 **`hitl:approval:credit-limit`**; runtime **`hitl:approval:credit-limit`** (`QUEUES.E4_HITL_CREDIT_LIMIT`) — vezi neuron și `queue-registry.ts`. |
| Destinație (graf) | `e4-hitl` | Agregat **familie HITL E4** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e4/hitl.md`](../../../../adr/families/e4/hitl.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **hitl-approval-credit-limit** sub agregatul **`e4-hitl`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

În acest folder există doar manifestul **`hitl-approval-credit-limit-family.md`**; nu sunt definite muchii `dependency` suplimentare la nivel de contract sinapsă în același director.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime (ADR-0001):** `e4-hitl` nu este cheie în `QUEUES`; coada executabilă pentru acest traseu este **`hitl:approval:credit-limit`** — vezi `E4_HITL_CREDIT_LIMIT` în `queue-registry.ts` și contractul neuron.
- **Semantic (ADR-0002):** **`e4:hitl:credit-limit`** — vezi `cognitive-node-catalog.ts` citat în contractul neuron.
- **Planificare:** v2 §7 — `hitl-approval-credit-limit` → `e4-hitl`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Span vs catalog:** posibilă divergență între string-ul `withCognitiveSpan` și atributele din catalog — vezi tabelul self-aware din [`hitl--approval--credit-limit.md`](../../../neurons/E4/hitl--approval--credit-limit.md); nu o rezolva aici prin presupuneri.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`hitl-approval-credit-limit-family\``.
