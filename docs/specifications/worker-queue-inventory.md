# CERNIQ.APP — Worker & Queue Inventory

## Mapare Completă 313 Workeri → Queues

**Versiune:** 1.0  
**Data:** 20 Ianuarie 2026  
**Referință:** [Master Specification](./master-specification.md) §2.5

---

## SUMAR EXECUTIV

| Metric | Valoare |
| ------ | ------- |
| **Total Workeri** | 313 |
| **Queues Unice** | ~180 |
| **Queues Partajate** | ~45 (mai mulți workeri pe aceeași coadă) |

### Clarificare Terminologie

- **Worker** = Proces Node.js care procesează joburi din una sau mai multe cozi
- **Queue** = Coadă BullMQ care stochează joburi Redis
- **Job** = Unitate de lucru individuală dintr-o coadă

> **Notă:** Un worker poate procesa multiple joburi simultan (concurrency), iar mai mulți workeri pot procesa aceeași coadă (horizontal scaling).

---

## INVENTAR PER ETAPĂ

### ETAPA 1: Data Enrichment (58 Workeri)

| Cat. | Worker | Queue | Concurrency | Rate Limit |
| ---- | ------ | ----- | ----------- | ---------- |
| A | csv-parser | `ingest:csv` | 5 | - |
| A | excel-parser | `ingest:excel` | 5 | - |
| A | webhook-receiver | `ingest:webhook` | 10 | 100/min |
| A | manual-entry | `ingest:manual` | 3 | - |
| A | api-connector | `ingest:api` | 5 | varies |
| B | cui-normalizer | `normalize:cui` | 20 | - |
| B | email-normalizer | `normalize:email` | 20 | - |
| B | phone-normalizer | `normalize:phone` | 20 | - |
| B | name-normalizer | `normalize:name` | 20 | - |
| C | cui-validator | `validate:cui` | 20 | - |
| C | email-validator | `validate:email` | 10 | 50/min |
| D | anaf-tva-fetcher | `enrich:anaf:tva` | 3 | 1 req/sec (max 100 CUI/request) |
| D | anaf-bilant-fetcher | `enrich:anaf:bilant` | 3 | 1 req/sec (max 100 CUI/request) |
| D | anaf-ws-fetcher | `enrich:anaf:ws` | 2 | 1 req/sec (max 100 CUI/request) |
| E | termene-company | `enrich:termene:company` | 2 | 20/min |
| E | termene-associates | `enrich:termene:associates` | 2 | 20/min |
| E | termene-litigations | `enrich:termene:litigations` | 2 | 20/min |
| F | onrc-scraper | `enrich:onrc` | 2 | 10/min |
| F | onrc-associates | `enrich:onrc:associates` | 2 | 10/min |
| G | email-pattern-gen | `discover:email:patterns` | 10 | - |
| G | hunter-lookup | `discover:email:hunter` | 5 | 50/min |
| G | email-verifier | `discover:email:verify` | 5 | 100/min |
| H | phone-validator | `validate:phone` | 10 | - |
| H | phone-carrier | `discover:phone:carrier` | 5 | 50/min |
| I | website-scraper | `scrape:website` | 5 | 30/min |
| I | social-scraper | `scrape:social` | 3 | 20/min |
| J | ai-categorizer | `ai:categorize` | 3 | 10/min |
| J | ai-scorer | `ai:score` | 3 | 10/min |
| K | geocoder | `geo:geocode` | 5 | 50/min |
| K | region-mapper | `geo:region` | 10 | - |
| L | apia-checker | `agri:apia` | 2 | 10/min |
| L | caen-agri-checker | `agri:caen` | 10 | - |
| M | dedup-exact | `dedup:exact` | 10 | - |
| M | dedup-fuzzy | `dedup:fuzzy` | 5 | - |
| N | quality-scorer | `score:quality` | 10 | - |
| N | lead-scorer | `score:lead` | 10 | - |
| O | silver-to-gold | `promote:silver-gold` | 5 | - |
| P | pipeline-orchestrator | `pipeline:orchestrate` | 3 | - |
| + 20 more | ... | ... | ... | ... |

### ETAPA 2: Cold Outreach (52 Workeri)

| Cat. | Worker | Queue | Concurrency | Rate Limit |
| ---- | ------ | ----- | ----------- | ---------- |
| A | quota-checker | `quota:check` | 10 | - |
| A | quota-consumer | `quota:consume` | 10 | - |
| A | quota-resetter | `quota:reset` | 1 | - |
| B | sequence-starter | `sequence:start` | 5 | - |
| B | sequence-step | `sequence:step` | 10 | - |
| B | sequence-stopper | `sequence:stop` | 5 | - |
| C | whatsapp-sender | `outreach:whatsapp:send` | 5 | 200/day/phone |
| C | whatsapp-receiver | `outreach:whatsapp:receive` | 10 | - |
| C | phone-rotation | `outreach:whatsapp:rotate` | 3 | - |
| C | warmup-manager | `outreach:whatsapp:warmup` | 2 | - |
| C | ban-detector | `outreach:whatsapp:ban` | 5 | - |
| D | email-sender-resend | `outreach:email:send` | 10 | 500/hour |
| D | email-tracker | `outreach:email:track` | 10 | - |
| E | instantly-warmup | `outreach:email:warmup` | 2 | - |
| E | deliverability-check | `outreach:email:deliverability` | 3 | - |
| F | sms-sender | `outreach:sms:send` | 5 | 100/hour |
| + 36 more | ... | ... | ... | ... |

### ETAPA 3: AI Sales Agent (78 Workeri)

| Cat. | Worker | Queue | Concurrency | Rate Limit |
| ---- | ------ | ----- | ----------- | ---------- |
| A | product-indexer | `catalog:index` | 3 | - |
| A | embedding-generator | `catalog:embed` | 3 | 60/min |
| B | hybrid-searcher | `rag:search` | 10 | - |
| B | reranker | `rag:rerank` | 5 | - |
| C | ai-agent | `agent:chat` | 10 | 60/min |
| C | tool-executor | `agent:tools` | 10 | - |
| D | negotiation-fsm | `negotiation:state` | 10 | - |
| E | pricing-calculator | `pricing:calculate` | 10 | - |
| E | discount-approver | `pricing:discount` | 5 | - |
| F | stock-checker | `stock:check` | 10 | - |
| F | stock-reserver | `stock:reserve` | 5 | - |
| G | oblio-invoicer | `invoice:oblio` | 3 | 30/min |
| H | efactura-submitter | `invoice:efactura` | 2 | 10/min |
| I | guardrail-validator | `guardrail:validate` | 10 | - |
| I | prompt-sanitizer | `guardrail:sanitize` | 10 | - |
| J | sentiment-analyzer | `sentiment:analyze` | 5 | - |
| K | handover-trigger | `handover:trigger` | 5 | - |
| L | mcp-server | `mcp:execute` | 5 | - |
| + 60 more | ... | ... | ... | ... |

### ETAPA 4: Post-Sale (67 Workeri)

| Cat. | Worker | Queue | Concurrency | Rate Limit |
| ---- | ------ | ----- | ----------- | ---------- |
| A | revolut-payment | `payment:revolut` | 5 | 100/min |
| A | webhook-processor | `payment:webhook` | 10 | - |
| B | reconciliation | `accounting:reconcile` | 3 | - |
| C | credit-scorer | `credit:score` | 5 | - |
| D | credit-limiter | `credit:limit` | 5 | - |
| E | sameday-awb | `logistics:sameday:awb` | 5 | 50/min |
| E | sameday-tracker | `logistics:sameday:track` | 5 | - |
| F | stock-syncer | `stock:sync` | 3 | - |
| G | contract-generator | `docs:contract` | 3 | - |
| H | return-processor | `returns:process` | 5 | - |
| I | alert-dispatcher | `alerts:dispatch` | 10 | - |
| + 56 more | ... | ... | ... | ... |

### ETAPA 5: Nurturing (58 Workeri)

| Cat. | Worker | Queue | Concurrency | Rate Limit |
| ---- | ------ | ----- | ----------- | ---------- |
| A | campaign-executor | `campaign:execute` | 5 | - |
| A | campaign-tracker | `campaign:track` | 10 | - |
| B | segmenter-rfm | `segment:rfm` | 3 | - |
| C | graph-builder | `graph:build` | 2 | - |
| C | graph-analyzer | `graph:analyze` | 2 | - |
| D | churn-predictor | `churn:predict` | 3 | - |
| D | winback-trigger | `churn:winback` | 3 | - |
| E | proximity-finder | `geo:proximity` | 5 | - |
| + 50 more | ... | ... | ... | ... |

---

## QUEUE PATTERNS

### Naming Convention

```text
{domain}:{action}[:{provider}]

Exemple:
- enrich:anaf:tva
- outreach:whatsapp:send
- invoice:oblio
```

### Priority Levels

| Priority | Queues | Use Case |
| -------- | ------ | -------- |
| 1 (High) | `payment:*`, `invoice:*` | Critical business |
| 2 (Normal) | `outreach:*`, `agent:*` | Core operations |
| 3 (Low) | `enrich:*`, `campaign:*` | Background tasks |

### Scaling Guidelines

| Load | Workers per Queue | Total Pods |
| ---- | ----------------- | ---------- |
| Low (<100 jobs/min) | 1 | 1 |
| Medium (100-500/min) | 2-3 | 2 |
| High (>500/min) | 5-10 | 3-5 |

---
---

## REDIS MEMORY OPTIMIZATION (Mandatory)

### 1. Large Payload Offloading (>10KB)

Redis trebuie să stocheze doar **metadate** și **referințe** pentru a preveni umplerea memoriei (R-012).

| Payload Size | Strategy | Storage Location            | Job Data Structure           |
| ------------ | -------- | --------------------------- | ---------------------------- |
| **< 10KB**   | Inline   | Redis RAM                   | `{ "data": ... }`            |
| **> 10KB**   | Offload  | PostgreSQL (`job_payloads`) | `{ "payloadRef": "uuid" }`   |

### 2. Job Retention Policies

Toate cozile trebuie configurate cu politici stricte de ștergere automată:

```typescript
const queueSettings = {
  removeOnComplete: {
    age: 3600, // Keep 1 hour
    count: 100 // Max 100 items
  },
  removeOnFail: {
    age: 24 * 3600, // Keep 24 hours
    count: 1000
  }
};
```

### 3. Eviction Policy

Configurarea Redis `maxmemory-policy` este `noeviction` pentru cozi. Monitorizarea este critică.

- **Alert:** Memory usage > 70%
- **Action:** Scale up Redis or Flush old jobs via script

## DOCUMENTE CONEXE

- [Architecture Overview](../architecture/architecture.md)
- [Master Specification §2.5](./master-specification.md)
- [BullMQ Configuration](../infrastructure/docker-compose-reference.md)

---

**Actualizat:** 20 Ianuarie 2026
