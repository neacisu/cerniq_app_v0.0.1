# CERNIQ.APP — ETAPA 1: INDEX TESTE DATA ENRICHMENT

## Documentație testare pentru 126 taskuri și 58 workeri

**Versiunea:** 1.0 | **Data:** 20 Ianuarie 2026 | **Status:** NORMATIV  
**Referință:** [etapa1-plan-implementare-COMPLET.md](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-plan-implementare-COMPLET.md)

---

## SUMAR

| Fază | Denumire | Taskuri | Workeri | Document Teste |
| ---- | -------- | ------- | ------- | -------------- |
| F1.1 | Database Schema Bronze | 6 | — | [e1-f01-schema-bronze.md](./e1-f01-schema-bronze.md) |
| F1.2 | Database Schema Silver | 6 | — | [e1-f02-schema-silver.md](./e1-f02-schema-silver.md) |
| F1.3 | Database Schema Gold | 6 | — | [e1-f03-schema-gold.md](./e1-f03-schema-gold.md) |
| F1.4 | Workers Infrastructure | 8 | — | [e1-f04-workers-infrastructure.md](./e1-f04-workers-infrastructure.md) |
| F1.5 | Workers Cat. A - Ingestie | 6 | 5 | [e1-f05-workers-A-ingestie.md](./e1-f05-workers-A-ingestie.md) |
| F1.6 | Workers Cat. B-C - Normalizare | 8 | 6 | [e1-f06-workers-BC-normalizare.md](./e1-f06-workers-BC-normalizare.md) |
| F1.7 | Workers Cat. D-E - ANAF, Termene | 10 | 9 | [e1-f07-workers-DE-anaf-termene.md](./e1-f07-workers-DE-anaf-termene.md) |
| F1.8 | Workers Cat. F-H - ONRC, Email | 12 | 11 | [e1-f08-workers-FH-onrc-email.md](./e1-f08-workers-FH-onrc-email.md) |
| F1.9 | Workers Cat. I-L - Scraping, AI | 14 | 16 | [e1-f09-workers-IL-scraping-ai.md](./e1-f09-workers-IL-scraping-ai.md) |
| F1.10 | Workers Cat. M-P - Dedup, Score | 10 | 9 | [e1-f10-workers-MP-dedup-score.md](./e1-f10-workers-MP-dedup-score.md) |
| F1.11 | HITL Integration | 6 | 2 | [e1-f11-hitl-integration.md](./e1-f11-hitl-integration.md) |
| F1.12 | Backend API | 10 | — | [e1-f12-backend-api.md](./e1-f12-backend-api.md) |
| F1.13 | Frontend Pages | 10 | — | [e1-f13-frontend-pages.md](./e1-f13-frontend-pages.md) |
| F1.14 | Frontend Components | 8 | — | [e1-f14-frontend-components.md](./e1-f14-frontend-components.md) |
| F1.15 | Testing & Monitoring | 6 | — | [e1-f15-testing-monitoring.md](./e1-f15-testing-monitoring.md) |
| **TOTAL** | | **126** | **58** | **15 documente** |

---

## WORKER CATEGORIES

### Category A: Ingestie (5 workeri)

| Worker | Queue | Test Focus |
| ------ | ----- | ---------- |
| A.1 CSV Parser | `bronze:ingest:csv-parser` | Streaming, encoding, errors |
| A.2 Excel Parser | `bronze:ingest:excel-parser` | Sheet selection, date formats |
| A.3 Webhook Receiver | `bronze:ingest:webhook` | Signature validation, idempotency |
| A.4 Manual Entry | `bronze:ingest:manual` | Validation, batch creation |
| A.5 API Connector | `bronze:ingest:api` | External API polling |

### Category B-C: Normalizare & Validare (6 workeri)

| Worker | Queue | Test Focus |
| ------ | ----- | ---------- |
| B.1 CUI Normalizer | `bronze:normalize:cui` | RO prefix, leading zeros |
| B.2 Email Normalizer | `bronze:normalize:email` | Lowercase, domain validation |
| B.3 Phone Normalizer | `bronze:normalize:phone` | +40, formatting |
| B.4 Name Normalizer | `bronze:normalize:name` | Uppercase, diacritics |
| C.1 CUI Validator | `bronze:validate:cui` | Checksum algorithm |
| C.2 Email Validator | `bronze:validate:email` | MX lookup, syntax |

### Category D-E: ANAF & Termene.ro (9 workeri)

| Worker | Queue | Test Focus |
| ------ | ----- | ---------- |
| D.1 ANAF TVA | `silver:enrich:anaf-tva` | API mocking, status parsing |
| D.2 ANAF Fiscala | `silver:enrich:anaf-fiscal` | CAEN extraction |
| D.3 ANAF eFactura | `silver:enrich:anaf-efactura` | SPV status |
| D.4 ANAF Bilant | `silver:enrich:anaf-bilant` | Financial data |
| D.5 ANAF Retry | `silver:enrich:anaf-retry` | Rate limiting, backoff |
| E.1 Termene Company | `silver:enrich:termene-company` | Scraping, anti-block |
| E.2 Termene Dosare | `silver:enrich:termene-dosare` | JSON parsing |
| E.3 Termene Financiar | `silver:enrich:termene-financial` | Number parsing |
| E.4 Termene Retry | `silver:enrich:termene-retry` | Exponential backoff |

### Category F-H: ONRC, Email, Phone (11 workeri)

| Worker | Queue | Test Focus |
| ------ | ----- | ---------- |
| F.1 ONRC Search | `silver:enrich:onrc-search` | Portal scraping |
| F.2 ONRC Details | `silver:enrich:onrc-details` | Data extraction |
| F.3 ONRC Retry | `silver:enrich:onrc-retry` | Rate limiting |
| G.1 Email Discovery | `silver:enrich:email-discovery` | Pattern generation |
| G.2 Email Hunter | `silver:enrich:email-hunter` | API mocking |
| G.3 Email Verifier | `silver:enrich:email-verifier` | SMTP check mock |
| G.4 Email Enricher | `silver:enrich:email-enricher` | Aggregation |
| G.5 Email Retry | `silver:enrich:email-retry` | Backoff |
| H.1 Phone Validator | `silver:enrich:phone-validator` | Numverify mock |
| H.2 Phone Carrier | `silver:enrich:phone-carrier` | Carrier lookup |
| H.3 Phone Retry | `silver:enrich:phone-retry` | Backoff |

### Category I-L: Scraping, AI, Geo, Agricultural (16 workeri)

| Worker | Queue | Test Focus |
| ------ | ----- | ---------- |
| I.1 Website Scraper | `silver:enrich:website-scraper` | Puppeteer, timeout |
| I.2 Social Scraper | `silver:enrich:social-scraper` | LinkedIn, Facebook mock |
| I.3 News Scraper | `silver:enrich:news-scraper` | Article extraction |
| I.4 Scraping Retry | `silver:enrich:scraping-retry` | Rate limiting |
| J.1 AI Categorizer | `silver:enrich:ai-categorizer` | LLM response parsing |
| J.2 AI Summarizer | `silver:enrich:ai-summarizer` | Token limits |
| J.3 AI Scorer | `silver:enrich:ai-scorer` | Numeric extraction |
| J.4 AI Retry | `silver:enrich:ai-retry` | API errors |
| K.1 Geocoder | `silver:enrich:geocoder` | Google Maps mock |
| K.2 Geocoder Batch | `silver:enrich:geocoder-batch` | Batch optimization |
| K.3 Geocoder Retry | `silver:enrich:geocoder-retry` | Quota handling |
| L.1 APIA Checker | `silver:enrich:apia-checker` | Agricultural data |
| L.2 APIA Enricher | `silver:enrich:apia-enricher` | Farm details |
| L.3 DAJ Checker | `silver:enrich:daj-checker` | County data |
| L.4 Agricultural Scorer | `silver:enrich:agri-scorer` | Category scoring |
| L.5 Agricultural Retry | `silver:enrich:agri-retry` | Backoff |

### Category M-P: Dedup, Score, Pipeline (9 workeri)

| Worker | Queue | Test Focus |
| ------ | ----- | ---------- |
| M.1 Dedup Exact | `silver:dedup:exact-match` | CUI matching |
| M.2 Dedup Fuzzy | `silver:dedup:fuzzy-match` | Jaro-Winkler, HITL trigger |
| N.1 Quality Scorer | `silver:score:quality` | Completeness, accuracy |
| N.2 Lead Scorer | `silver:score:lead` | Fit, engagement, intent |
| N.3 Score Retry | `silver:score:retry` | Recalculation |
| O.1 Silver→Gold | `silver:aggregate:promote` | Promotion eligibility |
| O.2 Gold Enricher | `gold:enrich:aggregate` | Final aggregation |
| P.1 Pipeline Orchestrator | `pipeline:orchestrate` | DAG execution |
| P.2 Pipeline Monitor | `pipeline:monitor` | Health metrics |

---

## COVERAGE TARGETS

| Categorie | Min Coverage | Critical |
| --------- | ------------ | -------- |
| Schema (F1.1-F1.3) | 80% | 90% |
| Workers (F1.5-F1.10) | 85% | 95% |
| HITL (F1.11) | 95% | 100% |
| API (F1.12) | 80% | 90% |
| Frontend (F1.13-F1.14) | 70% | — |

---

## TIPURI DE TESTE PER FAZĂ

| Fază | Unit | Integration | E2E | Contract | Mocking |
| ---- | ---- | ----------- | --- | -------- | ------- |
| F1.1-F1.3 | ✅ | ✅ | — | — | — |
| F1.4 | ✅ | ✅ | — | — | ✅ |
| F1.5-F1.10 | ✅ | ✅ | — | — | ✅ |
| F1.11 | ✅ | ✅ | ✅ | — | — |
| F1.12 | ✅ | ✅ | — | ✅ | — |
| F1.13-F1.14 | ✅ | — | ✅ | — | — |
| F1.15 | — | — | — | — | — |

---

## EXTERNAL API MOCKING

| API | Mock Strategy | Library |
| --- | ------------- | ------- |
| ANAF WebServices | MSW handlers | MSW |
| Termene.ro | Fixture responses | Vitest mocks |
| Hunter.io | MSW handlers | MSW |
| Numverify | Nock intercepts | Nock |
| Google Geocoding | MSW handlers | MSW |
| OpenAI / xAI | Response fixtures | MSW |

---

## PIPELINE FLOW TESTS

```typescript
// tests/integration/pipeline/data-flow.test.ts
describe('Data Pipeline Flow', () => {
  it('should process Bronze → Silver → Gold', async () => {
    // 1. Ingest to Bronze
    const bronze = await ingestContact(rawData);
    expect(bronze.processingStatus).toBe('pending');
    
    // 2. Normalize
    await processQueue('bronze:normalize:*');
    
    // 3. Validate
    await processQueue('bronze:validate:*');
    
    // 4. Promote to Silver
    await processQueue('bronze:promote');
    const silver = await getSilverCompany(bronze.promotedToSilverId);
    expect(silver).toBeDefined();
    
    // 5. Enrich (all sources)
    await processQueue('silver:enrich:*');
    
    // 6. Score
    await processQueue('silver:score:*');
    
    // 7. Promote to Gold
    await processQueue('silver:promote');
    const gold = await getGoldCompany(silver.promotedToGoldId);
    expect(gold).toBeDefined();
    expect(gold.leadScore).toBeGreaterThan(0);
  });
});
```

---

## DOCUMENTE CONEXE

- [00-testing-overview.md](../00-testing-overview.md) — Strategia generală
- [etapa-0/e0-index.md](../etapa-0/e0-index.md) — Teste infrastructură
- [cross-cutting/cc-hitl-tests.md](../cross-cutting/cc-hitl-tests.md) — Teste HITL
- [etapa1-workers-overview.md](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-workers-overview.md) — Worker docs

---

**Document generat:** 20 Ianuarie 2026  
**Conformitate:** Master Spec v1.2
