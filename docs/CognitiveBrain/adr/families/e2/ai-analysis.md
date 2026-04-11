# ADR-FAMILY-e2-ai-analysis

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e2-ai-analysis |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E2 |
| Familie | `ai-analysis` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e2-ai-analysis` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Familia **ai-analysis** acoperă inferență LLM pentru outreach rece: analiză sentiment, generare răspuns, clasificare intenție (în catalog). Aliniază micro-ciclul OODA per neuron din [cerniq_nuronal_research_base.md](../../cerniq_nuronal_research_base.md) ca **recomandare arhitecturală**; execuția concretă este în cozi BullMQ E2.

## Dovezi confirmate în Cerniq

### În cod și registry

- [packages/shared/src/cognitive-node-catalog.ts](../../../../packages/shared/src/cognitive-node-catalog.ts):

| nodeKey | Coadă BullMQ | Tip (catalog) |
| --- | --- | --- |
| `e2:ai:sentiment-analyze` | `ai:sentiment:analyze` | EmotionNeuron |
| `e2:ai:response-generate` | `ai:response:generate` | DeliberativeNeuron |
| `e2:ai:intent-classify` | `ai:intent:classify` | DeliberativeNeuron |

- [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts): `AI_SENTIMENT_ANALYZE`, `AI_RESPONSE_GENERATE`; comentariu explicit că `ai:intent:classify` a fost înlăturat din registry (intent îmbinat în sentiment).

### În exportul de graf (v2)

- **3** neuroni; exemple cozi: `ai:intent:classify`, `ai:response:generate`, `ai:sentiment:analyze`.

### Reconciliere registry / catalog / graf

| Sursă | Observație |
| --- | --- |
| Graf v2 | Include `ai:intent:classify`. |
| Registry | **Nu** există coadă `ai:intent:classify`; comentariu: intent îmbinat în `ai:sentiment:analyze`. |
| Catalog | Există încă `e2:ai:intent-classify` — **necesită** verificare dacă `nodeKey` este orfan sau mapat la alt procesor. |

## Decizie de guvernanță familială

1. **Proprietar:** Outreach / E2 Platform.
2. **Capabilitate:** ieșiri structurate și încredere pentru mesaje automate; escaladare la HITL la scoruri joase (politică transversală ADR-0008 în v2).
3. **Telemetrie:** severitate **HIGH**–**CRITICAL** pe neuroni generativi; span-uri cognitive via [workers/shared/src/cognitive-helpers.ts](../../../../workers/shared/src/cognitive-helpers.ts).
4. **Anomalii:** drift sentiment, refuz model, timeout provider.
5. **Guardrail:** conținut outbound supus politicii de produs și HITL pentru mesaje sensibile.

## Aliniere la cercetare

- Ieșiri structurate / SGLang: direcție în v2 §0.3 și research base — **nu** echivalent cu starea endpoint-urilor din CMDB la momentul auditului.

## Contracte și indexare

- [contracts/neurons/](../../contracts/neurons/) — `ai:sentiment:analyze`, `ai:response:generate`, etc.

## Criterii de acceptanță

- [ ] Mapare clară `e2:ai:intent-classify` ↔ runtime (sau retragere din catalog).
- [ ] Runbook escaladare când `ai:response:generate` eșuează.

## Research extern

- Opțional: calibrare încredere LLM — doar cu surse verificate la data lucrului.

## Limită evidență

- Payload-uri job și ramuri handler pentru fiecare coadă: **nu** extrase din export graf; necesită citire [workers/outreach/](../../../../workers/outreach/) sau echivalent.
