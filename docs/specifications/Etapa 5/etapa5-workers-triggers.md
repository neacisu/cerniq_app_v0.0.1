# CERNIQ.APP — ETAPA 5: WORKERS TRIGGERS
## Complete Trigger Map pentru 58 Workers
### Versiunea 1.0 | 19 Ianuarie 2026

---

## 1. Trigger Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        ETAPA 5 - TRIGGER FLOW DIAGRAM                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  EXTERNAL TRIGGERS                     INTERNAL TRIGGERS                         │
│  ─────────────────                     ─────────────────                         │
│                                                                                  │
│  ┌─────────────────┐                   ┌─────────────────┐                      │
│  │ Etapa 4 Output  │──────────────────►│ A1: lifecycle:  │                      │
│  │ ORDER_DELIVERED │                   │ order:completed │                      │
│  └─────────────────┘                   └────────┬────────┘                      │
│                                                 │                                │
│  ┌─────────────────┐                           ▼                                │
│  │ WhatsApp Webhook│──────────────────►┌───────────────┐                        │
│  │ Message Received│                   │ B12: sentiment│───►B9: churn:signal   │
│  └─────────────────┘                   │ :analyze      │                        │
│                                        └───────────────┘                        │
│  ┌─────────────────┐                                                            │
│  │ Cron: Daily     │──────────────────►┌───────────────┐                        │
│  │ 02:00 UTC       │                   │ B14: decay:   │───►B10: churn:score   │
│  └─────────────────┘                   │ behavior      │                        │
│                                        └───────────────┘                        │
│  ┌─────────────────┐                                                            │
│  │ Cron: Weekly    │──────────────────►┌───────────────┐                        │
│  │ Sunday 03:00    │                   │ D20: graph:   │───►D21: community     │
│  └─────────────────┘                   │ build         │                        │
│                                        └───────────────┘                        │
│  ┌─────────────────┐                                                            │
│  │ NPS Response    │──────────────────►┌───────────────┐                        │
│  │ Webhook         │                   │ H44: feedback │───►A2: state:evaluate │
│  └─────────────────┘                   │ :nps:process  │                        │
│                                        └───────────────┘                        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Complete Trigger Matrix

### Categoria A: Nurturing State Machine

| Worker | Trigger Type | Trigger Source | Payload |
|--------|--------------|----------------|---------|
| A1: lifecycle:order:completed | EVENT | Etapa 4 ORDER_DELIVERED | `{orderId, clientId, orderValue}` |
| A2: lifecycle:state:evaluate | CHAIN | A1, B10, H44, F36 | `{clientId, trigger}` |
| A3: onboarding:sequence:start | CHAIN | A1 (new client) | `{clientId, nurturingStateId}` |
| A4: onboarding:step:execute | CHAIN/DELAY | A3, A4 (self) | `{clientId, stepIndex}` |
| A5: onboarding:complete:check | CRON | Daily 06:00 | `{tenantId}` |
| A6: state:transition:execute | CHAIN | A2 (state changed) | `{clientId, fromState, toState}` |
| A7: state:metrics:update | CRON | Daily 04:00 | `{tenantId}` |
| A8: state:advocate:promote | CHAIN | A6 (to ADVOCATE), D23 | `{clientId, kolScore}` |

### Categoria B: Churn Detection

| Worker | Trigger Type | Trigger Source | Payload |
|--------|--------------|----------------|---------|
| B9: churn:signal:detect | CHAIN | B12, B14, Payment events | `{clientId, sourceType, sourceData}` |
| B10: churn:score:calculate | CHAIN | B9, B13 | `{clientId}` |
| B11: churn:risk:escalate | CHAIN | B10 (score > threshold) | `{clientId, score, riskLevel}` |
| B12: sentiment:analyze | EVENT | WhatsApp/Email received | `{messageId, clientId, text}` |
| B13: sentiment:aggregate | CHAIN/CRON | B12, Daily | `{clientId}` |
| B14: decay:behavior:detect | CRON | Daily 02:00 | `{tenantId}` |

### Categoria C: Geospatial Analysis

| Worker | Trigger Type | Trigger Source | Payload |
|--------|--------------|----------------|---------|
| C15: geo:proximity:calculate | MANUAL/CHAIN | API, A6 (new client) | `{anchorClientId, radiusKm}` |
| C16: geo:neighbor:identify | CHAIN | C15, A1 | `{clientId}` |
| C17: geo:territory:calculate | CHAIN | D21, G42 | `{clusterId/associationId}` |
| C18: geo:coverage:analyze | CRON | Weekly | `{tenantId}` |
| C19: geo:catchment:build | CHAIN | C17 | `{clusterId}` |

### Categoria D: Graph Analysis

| Worker | Trigger Type | Trigger Source | Payload |
|--------|--------------|----------------|---------|
| D20: graph:build:relationships | CRON | Weekly Sunday 03:00 | `{tenantId, scope}` |
| D21: community:detect:leiden | CHAIN | D20 | `{tenantId, graphId}` |
| D22: centrality:calculate | CHAIN | D20 | `{tenantId, graphId}` |
| D23: kol:identify | CHAIN | D22 | `{tenantId}` |
| D24: cluster:implicit:detect | CHAIN | D21 | `{tenantId, communities}` |

### Categoria E: Referral System

| Worker | Trigger Type | Trigger Source | Payload |
|--------|--------------|----------------|---------|
| E25: referral:detect:mention | CHAIN | B12 (mention detected) | `{clientId, messageId, text}` |
| E26: referral:request:send | CHAIN/DELAY | E25 (24h delay) | `{clientId, referredName}` |
| E27: referral:consent:process | EVENT | WhatsApp response | `{referralId, response}` |
| E28: referral:outreach:execute | CHAIN | E27 (consent given) | `{referralId}` |
| E29: referral:conversion:track | EVENT | ORDER for referred | `{prospectId, orderId}` |
| E30: referral:reward:calculate | CHAIN | E29 | `{referralId, orderValue}` |
| E31: referral:reward:process | CHAIN/HITL | E30 | `{referralId, rewardType}` |

### Categoria F: Win-Back Campaigns

| Worker | Trigger Type | Trigger Source | Payload |
|--------|--------------|----------------|---------|
| F32: winback:campaign:create | CHAIN | A6 (to CHURNED), B11 | `{clientId, triggeredBy}` |
| F33: winback:step:execute | CHAIN/DELAY | F32, F33 (self) | `{campaignId, stepIndex}` |
| F34: winback:response:process | EVENT | WhatsApp/Email response | `{campaignId, response}` |
| F35: winback:conversion:track | EVENT | ORDER from churned | `{clientId, orderId}` |
| F36: reactivation:complete | CHAIN | F35 | `{clientId, campaignId}` |

### Categoria G: Association Data Ingestion

| Worker | Trigger Type | Trigger Source | Payload |
|--------|--------------|----------------|---------|
| G37: ingest:ouai:scrape | CRON/MANUAL | Monthly, API | `{sourceUrl, registryYear}` |
| G38: ingest:ouai:parse | CHAIN | G37 | `{ouaiData}` |
| G39: ingest:cooperative:scrape | CRON/MANUAL | Monthly, API | `{sourceUrl}` |
| G40: ingest:cooperative:parse | CHAIN | G39 | `{cooperativeData}` |
| G41: ingest:madr:sync | CRON | Monthly 1st | `{registryType}` |
| G42: ingest:affiliation:match | CHAIN | G38, G40 | `{associationId}` |

### Categoria H: Feedback & Zero-Party Data

| Worker | Trigger Type | Trigger Source | Payload |
|--------|--------------|----------------|---------|
| H43: feedback:nps:send | CHAIN/DELAY | A1 (3 days delay), CRON | `{clientId, surveyType}` |
| H44: feedback:nps:process | EVENT | Survey response webhook | `{surveyId, rating, feedback}` |
| H45: feedback:extract:entities | CHAIN | B12 | `{messageId, analysis}` |
| H46: feedback:competitor:detect | CHAIN | B12 (competitor mentioned) | `{clientId, competitors}` |
| H47: feedback:crm:writeback | CHAIN | H45, H46 | `{clientId, extractedData}` |

### Categoria I: Content & Educational

| Worker | Trigger Type | Trigger Source | Payload |
|--------|--------------|----------------|---------|
| I48: content:drip:schedule | CRON | Daily 05:00 | `{tenantId}` |
| I49: content:drip:execute | CHAIN | I48 | `{dripId, clientId}` |
| I50: content:generate:personalize | CHAIN | I49 | `{clientId, templateId}` |
| I51: content:engagement:track | EVENT | Email/WhatsApp events | `{actionId, eventType}` |

### Categoria J: Alert & Trigger

| Worker | Trigger Type | Trigger Source | Payload |
|--------|--------------|----------------|---------|
| J52: alert:weather:monitor | CRON | Every 6 hours | `{}` |
| J53: alert:weather:campaign | CHAIN | J52 (severe alert) | `{alertType, counties}` |
| J54: alert:subsidy:monitor | CRON | Weekly | `{}` |
| J55: trigger:seasonal:execute | CRON | Based on calendar | `{triggerType}` |

### Categoria K: Compliance & Governance

| Worker | Trigger Type | Trigger Source | Payload |
|--------|--------------|----------------|---------|
| K56: compliance:consent:verify | CHAIN | E28, any outreach | `{actionType, entityId}` |
| K57: compliance:competition:check | CHAIN | H46 (price intel) | `{intelId}` |
| K58: audit:trail:record | CHAIN | All workers | `{action, details}` |

---

## 3. Trigger Chain Diagrams

### Order to Nurturing Flow
```
ORDER_DELIVERED (Etapa 4)
    │
    ▼
A1: lifecycle:order:completed
    │
    ├──► A3: onboarding:sequence:start (if new)
    │        │
    │        └──► A4: onboarding:step:execute (multiple)
    │
    ├──► A2: lifecycle:state:evaluate
    │        │
    │        └──► A6: state:transition:execute (if changed)
    │
    ├──► H43: feedback:nps:send (delay: 3 days)
    │
    └──► C16: geo:neighbor:identify
```

### Message to Churn Flow
```
WHATSAPP_MESSAGE_RECEIVED
    │
    ▼
B12: sentiment:analyze
    │
    ├──► B9: churn:signal:detect (if negative)
    │        │
    │        └──► B10: churn:score:calculate
    │                 │
    │                 └──► B11: churn:risk:escalate (if HIGH/CRITICAL)
    │                          │
    │                          └──► HITL Task Created
    │
    ├──► E25: referral:detect:mention (if mention found)
    │
    └──► H46: feedback:competitor:detect (if competitor mentioned)
```

### Win-Back Flow
```
STATE: AT_RISK → CHURNED
    │
    ▼
F32: winback:campaign:create
    │
    ▼
F33: winback:step:execute (step 0)
    │
    ├──[delay: 3 days]──► F33: winback:step:execute (step 1)
    │
    ├──[delay: 7 days]──► F33: winback:step:execute (step 2)
    │
    └──[delay: 14 days]──► F33: winback:step:execute (step 3)
    
    ▼ (if response)
F34: winback:response:process
    │
    ▼ (if order)
F35: winback:conversion:track
    │
    ▼
F36: reactivation:complete ──► A2: lifecycle:state:evaluate
```

---

## 4. Cron Schedule Summary

| Time (UTC) | Worker | Frequency |
|------------|--------|-----------|
| 02:00 | B14: decay:behavior:detect | Daily |
| 04:00 | A7: state:metrics:update | Daily |
| 05:00 | I48: content:drip:schedule | Daily |
| 06:00 | A5: onboarding:complete:check | Daily |
| */6h | J52: alert:weather:monitor | Every 6 hours |
| Sunday 03:00 | D20: graph:build:relationships | Weekly |
| Weekly | C18: geo:coverage:analyze | Weekly |
| Weekly | J54: alert:subsidy:monitor | Weekly |
| Monthly 1st | G41: ingest:madr:sync | Monthly |

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
