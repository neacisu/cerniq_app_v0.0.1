# Cognitive Brain — documentație modulară

Acest director descompune conținutul din planul master într-o structură de contracte și ADR-uri editabile individual.

## Surse canonice

| Sursă | Rol |
| --- | --- |
| [`../cerniq_cognitive_brain_master_implementation_plan.md`](../cerniq_cognitive_brain_master_implementation_plan.md) | Plan de implementare, registru ADR global, ADR-uri pe familii, contracte neuron/sinapsă (§0–9). |
| [`../cerniq_nuronal_research_base.md`](../cerniq_nuronal_research_base.md) | Sinteză de cercetare (arhitectură cognitivă, orchestrare, ieșiri structurate, Neo4j, Kafka/BullMQ, guardrails, încredere, vizualizare, observabilitate, roadmap). |

## Hartă directoare

| Cale | Conținut (corespondent în planul master) |
| --- | --- |
| [`research/`](research/) | Teme extrase din baza de cercetare neuronală (CoALA, SGLang, etc.). |
| [`overview/`](overview/) | §0–2, §8–9: dovezi, baseline factual, direcție arhitecturală, reconciliere runtime/graf, consecințe imediate. |
| [`adr/global/`](adr/global/) | ADR-0001 … ADR-0008. |
| [`adr/families/`](adr/families/) | 52 × ADR-FAMILY pe etapă (E1–E5) și familie. **E1:** cele 11 fișiere din [`adr/families/e1/`](adr/families/e1/) sunt ADR-uri complete (2026-04-11), cu dovezi din cod și reconciliere față de exportul de graf — nu mai sunt placeholder-e. |
| [`governance/`](governance/) | Clase de sinapse și reguli tranzitorii (§5). |
| [`contracts/neurons/`](contracts/neurons/) | Un fișier placeholder per neuron (coadă canonică), grupat pe etapă. |
| [`contracts/synapses/`](contracts/synapses/) | Un fișier placeholder per sinapsă din registrul §7. |

## Regenerare contracte neuron/sinapsă

După actualizarea planului master, rulează din rădăcina repo:

```bash
python3 docs/CognitiveBrain/_generate_placeholders.py
```

Scriptul recitește planul master și rescrie fișierele din `contracts/neurons/`, `contracts/synapses/` și tabelele placeholder din `adr/families/` (MD060 compact, conform `.markdownlint.json`). **Atenție:** înainte de regenerare, excludeți sau versionați ADR-urile E1 complete din `adr/families/e1/` dacă scriptul le suprascrie — verificați comportamentul scriptului.

## Conformare documentație

Fișierele din `docs/CognitiveBrain/**` respectă [`.cursor/rules/documentation-and-research.mdc`](../../.cursor/rules/documentation-and-research.mdc) și [`.cursor/rules/anti-hallucination-global.mdc`](../../.cursor/rules/anti-hallucination-global.mdc) (dovezi, limite de evidență, fără presupuneri neexprimate).
