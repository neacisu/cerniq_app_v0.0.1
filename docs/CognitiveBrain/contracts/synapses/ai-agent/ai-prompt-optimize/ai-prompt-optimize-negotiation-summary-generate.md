# Sinapsă `ai-prompt-optimize-negotiation-summary-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-prompt-optimize-negotiation-summary-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-prompt-optimize/ai-prompt-optimize-negotiation-summary-generate.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-prompt-optimize` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-prompt-optimize` | **Planificare:** traseu `ai-prompt-optimize`. **Matrix:** `ai:prompt:optimize` → [`../../../neurons/E3/ai--prompt--optimize.md`](../../../neurons/E3/ai--prompt--optimize.md). **Gap registry** pentru coada nominală — vezi contractul neuron. |
| Destinație (graf) | `negotiation-summary-generate` | **Contract neuron (gap runtime destinație):** [`../../../neurons/E3/negotiation--summary--generate.md`](../../../neurons/E3/negotiation--summary--generate.md) — `negotiation:summary:generate` **nu** apare în `queue-registry.ts` la auditul din acel contract; **fără** `nodeKey` în `cognitive-node-catalog.ts` (căutare `summary` în catalog: zero la auditul neuronului). **Matrix:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — pentru `negotiation:summary:generate`, coloana **`queue_in_registry`** este `no`. **Consecință:** ambele capete sunt ancorate în v2/plan, dar **nu** ambele în ADR-0001 în starea documentată — **necesită reconciliere graf ↔ registry** înainte de interpretare executabilă. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** leagă declarativ `ai-prompt-optimize` de `negotiation-summary-generate`. v2: **„sinapsă canonică de pipeline”**, fără detalii. Din perspectivă declarativă, exprimă intenția ca optimizarea promptului să fie ordonată canonic față de generarea rezumatului de negociere; **fără** a afirma payload sau existența simultană a două cozi executabile în registry.

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

- **Runtime (ADR-0001):** sursă și destinație — ambele cu gap documentat în contractele neuron respective la audit; nu inventați cozi în registry.
- **Semantic (ADR-0002):** gap pentru ambele capete la auditul citit în contracte.
- **Planificare:** dependență declarată între optimizarea promptului și generarea rezumatului de negociere.

## Limite și reconcilieri

- Muchia este **export-grounded**; execuția end-to-end cere implementare sau ADR care aliniază cozile la registry.
- Slug `negotiation-summary-generate` ↔ coadă nominală `negotiation:summary:generate` (Matrix) — fără presupuneri despre mesaje.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-prompt-optimize-negotiation-summary-generate\``.
