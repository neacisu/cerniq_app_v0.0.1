# Sinapsă `ai-intent-classify-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-intent-classify-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-intent-classify/ai-intent-classify-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-intent-classify` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `ai-intent-classify` | Nod traseu în graf (slug). **Execuție (ADR-0001):** coadă BullMQ **`intent:classify`** (`QUEUES.E3_INTENT_CLASSIFY`). În **v2** și în catalog apare **`ai:intent:classify`**; registry-ul nu mai conține un șir literal de coadă `ai:intent:classify` (vezi comentariul din `queue-registry.ts`). Procesare: `intentClassifyProcessor` / K62 în `e3-ai-sales`. Reconciliere completă: [`../../../neurons/E2/ai--intent--classify.md`](../../../neurons/E2/ai--intent--classify.md). |
| Destinatie (graf) | `e2-ai-analysis` | Nod **agregat** E2 în planificare (etichetă graf), nu o singură coadă BullMQ; acoperă swimlane semantic `ai-analysis` pentru neuroni E2. Nu există un singur fișier `contracts/neurons/...` pentru această etichetă de graf. |

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

- **Runtime (ADR-0001):** capăt operațional sursă = **`intent:classify`** / `QUEUES.E3_INTENT_CLASSIFY` — nu echivalați automat cu șirul v2 `ai:intent:classify`. Contract neuron (trasabilitate v2 ↔ cod): [`../../../neurons/E2/ai--intent--classify.md`](../../../neurons/E2/ai--intent--classify.md). **Destinația** `e2-ai-analysis` este agregat de plan; pentru neuroni concreți în familia `ai-analysis`, vezi [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv).
- **Semantic (ADR-0002):** `e2:ai:intent-classify` / `ai:intent:classify` și `e3:intent:classify` / `intent:classify` în `cognitive-node-catalog.ts` — fără a reduce destinația graf la un singur `nodeKey`.
- **Planificare:** muchie **default** „specializează familia” în sensul exportului; fără handler sau payload dincolo de câmpurile din v2 §7.

## Limite și reconcilieri

- **Triplă denumire sursă:** slug graf `ai-intent-classify` ↔ coadă executată `intent:classify` ↔ câmp v2 `ai:intent:classify` — pentru **execuție** prevală `queue-registry.ts` și contractul neuron; graful rămâne sursa pentru **topologie planificată**.
- Nu inventați schemă payload, retry, safety sau telemetrie per-muchie acolo unde v2 marchează absența din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-intent-classify-family\``.
