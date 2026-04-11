# ADR-FAMILY-e1-quality

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e1-quality |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E1 |
| Familie | `quality` |
| Plan master | [cerniq_cognitive_brain_master_implementation_plan.md](../../cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e1-quality` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Familia **quality** agregă măsurători de calitate a datelor în E1: completitudine, acuratețe, prospețime, plus agregări rollup. În catalog, neuronii de **score** și **aggregate** împart swimlane-ul **`dedup-scoring`** cu deduplicarea — aceeași **familie cognitivă operațională** (scoring) chiar dacă eticheta grafică „quality” este mai îngustă.

## Dovezi confirmate în Cerniq

### În cod și registry

- [packages/shared/src/cognitive-node-catalog.ts](../../../../packages/shared/src/cognitive-node-catalog.ts):
  - `e1:score:completeness` → `score:completeness`
  - `e1:score:accuracy` → `score:accuracy`
  - `e1:score:freshness` → `score:freshness`
  - `e1:aggregate:daily-stats` → `aggregate:daily-stats`
  - `e1:aggregate:quality-rollup` → `aggregate:quality-rollup`
- [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts): `SCORE_COMPLETENESS`, `SCORE_ACCURACY`, `SCORE_FRESHNESS`, `AGGREGATE_DAILY_STATS`, `AGGREGATE_QUALITY_ROLLUP` cu aceleași string-uri; înregistrate în blocul E1 (concurențe 20/20/20/1/10).

### În exportul de graf (plan master)

- **3** neuroni; exemple: `silver:quality:completeness`, `silver:quality:tier-assign`, `silver:quality:validation-sum`.

### Reconciliere registry / export graf

- **Prefix runtime:** `score:*` și `aggregate:*` (nu `silver:quality:*`).
- **Număr:** catalog are **3** scoreri + **2** agregări în zona calitate/temporală; graful menționează **3** neuroni „quality” cu nume diferite (`tier-assign`, `validation-sum` nu apar ca atare în snippet-ul catalogului pentru `score:*`).
- **Consecință:** `tier-assign` / `validation-sum` pot fi **sinonime planificare** sau neuroni viitori — necesită mapare sau actualizare graf.

## Decizie de guvernanță familială

1. **Proprietar:** Data Quality + Analytics E1.
2. **Capabilitate:** măsurare și agregare calitate pentru decizii downstream (routing, outreach).
3. **Telemetrie:** span per nod; agregările pot emite evenimente rare — atenție la cardinalitate metrici (vezi research base §9 despre cardinalitate).
4. **Anomalii:** degradare completitudine pe surse, rollup inconsistent.
5. **Guardrail:** scorurile nu înlocuiesc politici contractuale fără validare produs.

## Aliniere la cercetare

[cerniq_nuronal_research_base.md](../../cerniq_nuronal_research_base.md) recomandă **gating pe încredere**; scorerii E1 alimentează astfel de porți în combinație cu `ai:score:confidence` (familia AI).

## Observabilitate

- Prometheus/Grafana: în afara acestui fișier; în cod, baza este OTel + evenimente cognitive.

## Contracte și indexare

- [contracts/neurons/](../../contracts/neurons/) — `score:`, `aggregate:`.
- Sinapse către pipeline și outreach — [contracts/synapses/](../../contracts/synapses/).

## Criterii de acceptanță

- [ ] Definiții matematice ale scorurilor (câmpuri, ponderi) în documentație normativă sau în cod comentat testat.
- [ ] Reconciliere nume `silver:quality:*` ↔ `score:*` publică.

## Research extern

- Opțional: convenții OTel metrics pentru GenAI dacă scorurile combină semnale model — `https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-metrics.md` (acces 2026-04-11).

## Limită evidență

- Interpretarea exactă a `tier-assign` și `validation-sum` din graf **nu** este găsită sub aceleași nume în catalog la audit.
