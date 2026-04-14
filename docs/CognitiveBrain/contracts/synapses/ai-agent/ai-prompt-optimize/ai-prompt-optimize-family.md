# Sinapsă `ai-prompt-optimize-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-prompt-optimize-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-prompt-optimize/ai-prompt-optimize-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-prompt-optimize` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `ai-prompt-optimize` | Nod de familie/traseu în graf; coada nominală v2 / Matrix: `ai:prompt:optimize` (E3, `ai-core`) — vezi [`../../../neurons/E3/ai--prompt--optimize.md`](../../../neurons/E3/ai--prompt--optimize.md): la audit **nu** există intrare în `queue-registry.ts` pentru acest literal; execuția canonică ADR-0001 **nu** este dovedită pentru sursă în snapshot-ul documentat acolo. |
| Destinație (graf) | `e3-ai-core` | Nod de **familie / nucleu** E3 în planificare, nu o singură coadă BullMQ; acoperă swimlane-ul semantic `ai-core`. Nu există un fișier `contracts/neurons/...` unic pentru această etichetă de graf. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Manifestul **`ai-prompt-optimize-family`** corespunde în v2 §7 unei muchii **default** de la `ai-prompt-optimize` către `e3-ai-core`. Rolul declarat este **„specializează familia”**: poziționează traseul de optimizare prompt în nucleul E3 din export, **fără** payload sau handler unic în câmpurile sinapsei.

## Sinapse dependență în același traseu (vecini în folder)

Muchii **dependency** către negociere (topologie v2 §7): [`ai-prompt-optimize-negotiation-expire-check.md`](ai-prompt-optimize-negotiation-expire-check.md), [`ai-prompt-optimize-negotiation-reminder-send.md`](ai-prompt-optimize-negotiation-reminder-send.md), [`ai-prompt-optimize-negotiation-state-transition.md`](ai-prompt-optimize-negotiation-state-transition.md), [`ai-prompt-optimize-negotiation-summary-generate.md`](ai-prompt-optimize-negotiation-summary-generate.md).

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

- **Runtime (ADR-0001):** pentru sursă, **`ai:prompt:optimize`** este nominal în v2 și în [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv), dar contractul neuron citează **absența** cozii în `queue-registry.ts`; pentru **`e3-ai-core`**, nu există o singură coadă — agregat de plan.
- **Semantic (ADR-0002):** fără `nodeKey` catalogat pentru `ai:prompt:optimize` la auditul din contractul neuron; **fără** echivalare automată `e3-ai-core` → un `nodeKey`.
- **Planificare (graf exportat):** muchie **default** de specializare; nu presupune execuție reală dincolo de export fără reconciliere cod.

## Limite și reconcilieri

- Slug graf `ai-prompt-optimize` vs coadă `ai:prompt:optimize` — mapare prin Matrix + contract neuron; **fără** presupuneri despre worker până la aliniere registry.
- Nu inventa payload, retry, safety sau telemetrie acolo unde v2 marchează absența din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — secțiunea **7. Complete synapse contract register**, bloc `SYNAPSE \`ai-prompt-optimize-family\``.
