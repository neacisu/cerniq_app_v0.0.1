# CERNIQ.APP — ETAPA 4: STANDARDS & PROCEDURES
## Operational Standards for Post-Sale Monitoring
### Versiunea 1.0 | 19 Ianuarie 2026

---

# CUPRINS

1. [Payment Processing Standards](#1-payment)
2. [Credit Management Standards](#2-credit)
3. [Logistics Standards](#3-logistics)
4. [Contract Standards](#4-contracts)
5. [HITL Standards](#5-hitl)
6. [Audit & Compliance](#6-audit)

---

## 1. Payment Processing Standards {#1-payment}

### 1.1 Reconciliation SLAs
| Type | Target | Max Time |
|------|--------|----------|
| Exact Match | Instant | 5 min |
| Fuzzy Match | < 1 hour | 4 hours |
| Manual (HITL) | < 8 hours | 24 hours |

### 1.2 Payment Reminder Schedule
| Days Overdue | Action | Channel |
|--------------|--------|---------|
| 3 | Friendly reminder | Email |
| 7 | First formal reminder | Email + WhatsApp |
| 14 | Second reminder | Email + WhatsApp + SMS |
| 21 | Final notice | All + Phone call |
| 30 | Block credit | + Internal escalation |

### 1.3 Refund Processing
- Refunds < 500 EUR: Auto-approve
- Refunds 500-1000 EUR: Manager approval (4h SLA)
- Refunds > 1000 EUR: CFO approval (2h SLA)
- Max processing time: 5 business days

---

## 2. Credit Management Standards {#2-credit}

### 2.1 Credit Score Refresh
| Trigger | Refresh Interval |
|---------|------------------|
| New client | Immediate |
| Order > 10K EUR | Immediate |
| Monthly cycle | 30 days |
| Payment overdue > 30 days | Immediate |

### 2.2 Risk Tier Limits
| Risk Tier | Score Range | Default Limit | Max Override |
|-----------|-------------|---------------|--------------|
| BLOCKED | 0-29 | 0 EUR | N/A |
| LOW | 30-49 | 5,000 EUR | 10,000 EUR |
| MEDIUM | 50-69 | 20,000 EUR | 30,000 EUR |
| HIGH | 70-89 | 50,000 EUR | 75,000 EUR |
| PREMIUM | 90-100 | 100,000 EUR | Custom |

### 2.3 Credit Override Rules
- One-time override: Valid pentru o singură comandă
- Temporary override: Valid 30 zile
- Permanent increase: Requires CFO approval + score > 60

---

## 3. Logistics Standards {#3-logistics}

### 3.1 AWB Generation
- Generate AWB când: Contract semnat + Plată primită/Credit aprobat
- Pickup schedule: Daily la 14:00 pentru AWB-uri create până la 12:00
- Label format: PDF, A6

### 3.2 Delivery Tracking
- Status poll interval: 30 minutes
- Status change notification: < 5 minutes
- Failed delivery retry: Max 3 încercări

### 3.3 COD Processing
- Expected collection: Within 48h of delivery
- Reconciliation: Daily la 10:00
- Discrepancy threshold: ±1 RON

---

## 4. Contract Standards {#4-contracts}

### 4.1 Contract Templates per Risk
| Risk Tier | Template | Special Clauses |
|-----------|----------|-----------------|
| LOW | Standard + Guarantees | Garanții bancară |
| MEDIUM | Standard | Payment terms strict |
| HIGH | Standard | Discount pentru plată rapidă |
| PREMIUM | Simplified | Termeni flexibili |

### 4.2 Signature Workflow
- Sent for signature → 7 days validity
- Reminder #1: Day 3
- Reminder #2: Day 5
- Expiry warning: Day 6
- Auto-expire: Day 7

### 4.3 Contract Storage
- Retention: 10 years
- Format: PDF/A for long-term
- Encryption: AES-256 at rest

---

## 5. HITL Standards {#5-hitl}

### 5.1 Response SLAs
| Priority | First Response | Resolution |
|----------|----------------|------------|
| CRITICAL | 15 min | 2 hours |
| HIGH | 1 hour | 4 hours |
| NORMAL | 4 hours | 8 hours |
| LOW | 8 hours | 24 hours |

### 5.2 Escalation Rules
- SLA breach at 50%: Notification to assignee
- SLA breach at 75%: Escalate to manager
- SLA breach at 100%: Escalate to director + alert

### 5.3 Decision Documentation
- All decisions require written justification
- Rejections require detailed reason
- Approvals > 10K EUR require second approval

---

## 6. Audit & Compliance {#6-audit}

### 6.1 Logging Requirements
- All state changes logged
- All API calls logged
- PII redacted after 90 days
- Full delete after 7 years

### 6.2 GDPR Compliance
- Right to access: < 30 days response
- Right to delete: < 30 days (with exceptions)
- Data portability: JSON export available

### 6.3 e-Factura Compliance
- Upload to SPV: Within 5 business days
- Store response: 10 years
- Error handling: Immediate retry + alert

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
