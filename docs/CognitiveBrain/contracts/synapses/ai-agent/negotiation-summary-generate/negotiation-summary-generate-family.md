# Sinapsă `negotiation-summary-generate-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `negotiation-summary-generate-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/negotiation-summary-generate/negotiation-summary-generate-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `negotiation-summary-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `negotiation-summary-generate` | Slug traseu în graf. Contract [`../../../neurons/E3/negotiation--summary--generate.md`](../../../neurons/E3/negotiation--summary--generate.md) documentează **gap runtime**: coada nominală **`negotiation:summary:generate`** negăsită în `queue-registry.ts` / catalog la audit. **Execuție:** necesită reconciliere graf ↔ registry înainte de a afirma o coadă BullMQ echivalentă. |
| Destinație (graf) | `e3-negotiation` | Agregat de planificare pentru familia **negotiation** (E3); nu este o singură coadă BullMQ. |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime (ADR-0001):** capăt sursă **nu** este ancorat încă printr-o constantă `QUEUES.*` dovedită în registry pentru `negotiation:summary:generate` — vezi contractul neuron. Destinația `e3-negotiation` rămâne agregat de graf.
- **Semantic (ADR-0002):** fără `nodeKey` catalog demonstrat pentru această coadă la data auditului din contractul neuron; **nu** inventați mapare.
- **Planificare:** muchie **default** „specializează familia” în sensul exportului.

## Limite și reconcilieri

- Topologia planificată (`negotiation-summary-generate` → `e3-negotiation`) coexistă cu **decalaj runtime** documentat pentru neuronul sursă; orice mapare viitoare se dovedește în cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`negotiation-summary-generate-family\``.
