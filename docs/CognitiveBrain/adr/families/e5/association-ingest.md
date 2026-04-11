# ADR-FAMILY-e5-association-ingest

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e5-association-ingest |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E5 |
| Familie | `association-ingest` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e5-association-ingest` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Ingestie date asociații agricole (OUAI, MADR), normalizare, CUI, potrivire membri, acoperire.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e5:association:ouai-scrape` | `association:ouai:scrape` |
| `e5:association:madr-scrape` | `association:madr:scrape` |
| `e5:association:normalize` | `association:normalize` |
| `e5:association:cui-lookup` | `association:cui:lookup` |
| `e5:association:member-match` | `association:member:match` |
| `e5:association:coverage-update` | `association:coverage:update` |

### Export graf (v2)

- **1** neuron; exemplu: `bronze:ingest:pdf-extractor`.

### Reconciliere

| Observație |
| --- |
| **Divergență majoră:** graf v2 plasează familia sub ingest **bronze**; catalog + registry definesc **`association:*`** pentru E5. Nu este aceeași coadă — fie graf agregat greșit pe familie, fie flux separat neînregistrat în registry sub `bronze:ingest:pdf-extractor`. |

## Decizie de guvernanță familială

1. **Proprietar:** E5 Agri Data.
2. **Capabilitate:** acoperire teritorială asociații.
3. **Telemetrie:** **HIGH** pe scraping și conformitate surse.

## Limită evidență

- Existența `bronze:ingest:pdf-extractor` în runtime: **neconfirmată** în `QUEUES` la audit.
