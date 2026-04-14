# Schema normativă — contract neuron (self-aware)

Fiecare fișier din acest director descrie **un** contract pentru o pereche **(Etapă, coadă canonică v2 §6)**. Dacă v2 înregistrează **două** blocuri `### NEURON` cu aceeași coadă și aceeași etapă (ex. `ai:intent:classify` — instanțe familie diferite), un singur fișier conține **subsecțiuni per instanță**.

## Legături obligatorii

- Plan v2 §6: [`../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../v2_cerniq_cognitive_brain_master_implementation_plan.md)
- ADR globale: [`../../adr/global/`](../../adr/global/)
- ADR familie: [`../../adr/families/`](../../adr/families/)
- Checklist autor: [`CONTRACT_AUTHORING_CHECKLIST.md`](CONTRACT_AUTHORING_CHECKLIST.md)

## Structură fișier (ordine)

1. **Titlu** — `# Neuron \`<v2_queue>\``
2. **Metadata** — tabel: `v2_queue`, `etapa`, `familie` (din v2), `adr_family_slug` (opțional), `contract_path`
3. **Scop în context real** — 2–6 propoziții din **dovezi**; dacă doar v2 este citit, se spune explicit că **codul nu a fost auditat**.
4. **Surse audit** — fișiere + linii sau teste; fără „repo” generic.
5. **Instanțe v2** — câte o subsecțiune `### Instanță …` per bloc `### NEURON` din v2 (inclusiv sufixul «duplicat #2» dacă există pentru aceeași etapă).
6. **Extras canonic v2** — citat scurt sau rezumat câmpuri critice (OODA, tier, model routing, evidence status).
7. **Tabel self-aware** — un singur tabel cu **13 rânduri** (numerotate 1–13 ca în planul de implementare) și coloane:

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |

- **În cod:** doar ce rezultă din `read`/`grep` pe handler, worker, teste; altfel formulare explicită de neaudit + dată. Generatorul `generate_neuron_contracts_from_v2.py` pune **placeholder** «TODO manual» — nu încerca raționamentul sau înlocuirea research-ului.
- **Țintă v2 / research:** ce spune v2, ADR-urile globale sau cercetarea internă pentru **acest** neuron.
- **Limită evidență:** trimitere la **v2 §2.4** unde nu există încă probă de implementare.
- **N/A:** permis cu **motiv** dacă criteriul nu se aplică (ex. rutare LLM pentru neuron Non-AI).

### Mapare OTel (obligatoriu în fișierul contract)

Rând dedicat sau sub-tabel: convenții v2 (`cognitive.neuron.id`, …) vs implementare [`withCognitiveSpan`](../../../../workers/shared/src/cognitive-helpers.ts) (`cognitive.nodeKey`, `cognitive.neuronType`, …).

## Rânduri 1–13 (criterii)

| # | Criteriu |
| --- | --- |
| 1 | Identitate canonică (`nodeKey` / catalog / gap) |
| 2 | Etapă, familie, swimlane |
| 3 | Rol declarat (`cognitiveFunction`, `biologicalAnalogy`) |
| 4 | `NeuronType` + clasificare SOFAI (System1 vs 2) — raportată ca **clasificare din v2**, fără citări bibliografice neverify |
| 5 | Criticitate |
| 6 | Înveliș telemetrie (OTel / GenAI dacă e cazul) |
| 7 | Înveliș politică (tier autonomie, praguri, Cedar/OPA — destinație documentată) |
| 8 | Rutare model (dacă AI) — comportament **numai** cu dovadă în cod |
| 9 | Guardrails |
| 10 | Escaladare HITL |
| 11 | Micro-OODA |
| 12 | Tier autonomie + de-escaladare (invarianți doar cu cod/test) |
| 13 | Subset stack v2 §2.3 relevant |

## Reguli anti-presupunere

- Nu copia **În cod** de la alt neuron.
- Nu afirma handler, payload sau tier fără fișier citat.
- Generatorul automat poate lăsa „Neaudit la generare”; completarea **În cod** este obligație la închiderea todo-ului `neuron-*`.
