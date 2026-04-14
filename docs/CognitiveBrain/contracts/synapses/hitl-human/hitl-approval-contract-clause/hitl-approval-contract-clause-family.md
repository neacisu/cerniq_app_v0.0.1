# Sinapsă `hitl-approval-contract-clause-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `hitl-approval-contract-clause-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/hitl-approval-contract-clause/hitl-approval-contract-clause-family.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `hitl-approval-contract-clause` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `hitl-approval-contract-clause` | Traseu în graf; contract neuron: [`../../../neurons/E4/hitl--approval--contract-clause.md`](../../../neurons/E4/hitl--approval--contract-clause.md). **Triplă autoritate:** v2 **`hitl:approval:contract-clause`**; runtime — **gap** la auditul din contract: **fără** literal în `queue-registry.ts`, **fără** procesor dedicat demonstrat — vezi neuron. |
| Destinație (graf) | `e4-hitl` | Agregat **familie HITL E4** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e4/hitl.md`](../../../../adr/families/e4/hitl.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **hitl-approval-contract-clause** sub agregatul **`e4-hitl`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

În acest folder există doar manifestul **`hitl-approval-contract-clause-family.md`**; nu sunt definite muchii `dependency` suplimentare la nivel de contract sinapsă în același director.

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

- **Runtime (ADR-0001):** `e4-hitl` nu este cheie în `QUEUES`; pentru acest neuron granular **nu** există coadă mapată în registry la auditul din contract — vezi [`hitl--approval--contract-clause.md`](../../../neurons/E4/hitl--approval--contract-clause.md).
- **Semantic (ADR-0002):** **fără** `nodeKey` catalog pentru `hitl:approval:contract-clause` la auditul din contract — vezi același fișier.
- **Planificare:** v2 §7 — `hitl-approval-contract-clause` → `e4-hitl`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Gap implementare:** topologia graf include traseul; **execuția** BullMQ pentru această coadă **nu** este dovedită în contractul neuron — nu echivala graful cu handler-ul K49 sau fluxuri DocuSign fără dovadă din același contract.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`hitl-approval-contract-clause-family\``.
