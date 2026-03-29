# EU AI Act — Conformity Assessment: Credit Scoring System

| Field              | Value                                            |
| ------------------ | ------------------------------------------------ |
| Document Version   | 1.0.0                                            |
| Classification     | HIGH-RISK (Annex III, Category 5b)               |
| Regulation         | Regulation (EU) 2024/1689 (EU AI Act)            |
| Applicable From    | 2 August 2026                                    |
| Penalty (max)      | EUR 35 000 000 or 7% annual worldwide turnover   |
| System Owner       | Cerniq SRL                                       |
| Last Review        | 2026-03-22                                       |

---

## 1. System Description

### 1.1 Purpose

The CerniqAPP credit scoring system evaluates the creditworthiness of business entities (Romanian companies) for the purpose of determining credit limits, payment terms, and risk categories in a B2B agricultural supply chain context.

### 1.2 Classification Rationale

Under Art. 6(2) and Annex III, Category 5(b) of Regulation (EU) 2024/1689, AI systems used to evaluate the creditworthiness of natural persons or establish their credit score are classified as **HIGH-RISK**. Although CerniqAPP primarily scores legal entities (companies), the scoring incorporates data about administrators and shareholders (natural persons), and affects financial decisions about entities run by natural persons. The precautionary principle applies.

### 1.3 Intended Use

- Automated calculation of internal risk scores (`scor_risc_intern`, 0-100)
- Risk categorization (`LOW`, `MEDIUM`, `HIGH`)
- Credit limit calculation (`limita_credit_calculata`)
- Payment terms determination (`conditii_plata`: RAMBURS, 15 ZILE, 30 ZILE, 60 ZILE)

### 1.4 Not Intended For

- Consumer lending (B2C)
- Decisions with no human oversight
- Replacement of formal credit bureau assessments

---

## 2. Technical Architecture

### 2.1 Model Architecture

The credit scoring system uses a **hybrid rule-based + ML approach**:

1. **Rule-based component** (deterministic):
   - Weighted factor scoring across 5 dimensions
   - ANAF fiscal status validation (active/inactive/suspended/radiated)
   - BPI insolvency flag check
   - CIP payment incidents analysis
   - Termene.ro `scor_risc_termene` (0-100) incorporation

2. **ML component** (probabilistic):
   - Self-hosted LLM reasoning (QwQ-32B-AWQ via infraq.app) for edge cases
   - Consensus voting for borderline decisions: 3 models, majority vote
   - Embeddings (qwen3-embedding-8b, halfvec 3072-dim) for company similarity clustering

### 2.2 Scoring Factors and Weights

| Factor                       | Weight | Source            | Description                           |
| ---------------------------- | ------ | ----------------- | ------------------------------------- |
| Financial health             | 30%    | Termene.ro        | Revenue, profit, assets, liabilities  |
| ANAF fiscal compliance       | 25%    | ANAF API          | TVA status, datorii, e-Factura        |
| Payment history              | 20%    | CIP + internal    | Incident count, refusal amounts       |
| Legal standing               | 15%    | BPI + Termene     | Insolvency, court cases, radiere      |
| Company maturity & structure | 10%    | ANAF + Termene    | Age, employees, CAEN sector           |

### 2.3 Data Sources

| Source       | Data Type                  | Update Frequency | Rate Limit  |
| ------------ | -------------------------- | ---------------- | ----------- |
| ANAF API     | Fiscal status, VAT, CAEN   | Per-request      | 1 req/sec   |
| Termene.ro   | Financials, risk score     | Per-request      | 20 req/sec  |
| BPI          | Insolvency proceedings     | Daily batch      | N/A         |
| CIP          | Payment incidents          | Daily batch      | N/A         |
| Internal     | Order history, payment     | Real-time        | N/A         |

### 2.4 Processing Queue

Queue: `e4:credit:scoring` processes credit score calculations with full traceability via OpenTelemetry spans and structured audit logging.

---

## 3. Human Oversight Mechanisms (Art. 14)

### 3.1 HITL Approval Flow

All credit decisions above defined thresholds require human approval via the unified `approval_tasks` system:

| Trigger Condition                      | Approval Type     | SLA  | Timeout Action |
| -------------------------------------- | ----------------- | ---- | -------------- |
| Risk score > 0.5 (50/100)             | `credit_approval` | 48h  | Reject         |
| Credit limit > EUR 100,000            | `credit_approval` | 48h  | Reject         |
| Borderline score (plus/minus 5 pts)   | `credit_approval` | 24h  | Escalate       |
| First-time customer                   | `credit_approval` | 24h  | Escalate       |

### 3.2 Override Capability

Human operators with role `manager` or higher can:
- Override calculated risk category
- Adjust credit limits (with audit trail)
- Override payment terms
- Flag false positives/negatives for model retraining

### 3.3 Escalation Path

1. Level 1: Credit Analyst (operator role)
2. Level 2: Credit Manager (manager role)
3. Level 3: VP Finance (admin role)

---

## 4. Bias Analysis and Fairness (Art. 10)

### 4.1 Protected Attributes

The scoring system does NOT use the following as direct inputs:
- Gender of administrators/shareholders
- Ethnicity or nationality
- Religion or political affiliation
- Age of natural persons (company age is used as a proxy for maturity)

### 4.2 Potential Proxy Discrimination Risks

| Risk                        | Mitigation                                        |
| --------------------------- | ------------------------------------------------- |
| Geographic bias (rural)     | No geographic weighting in score formula           |
| Sector bias (agriculture)   | Sector-normalized financial benchmarks             |
| Company age bias            | Capped weight (10%) for maturity factor            |
| Data source bias (Termene)  | Cross-validation with ANAF and internal data       |

### 4.3 Monitoring Obligations

- Quarterly bias audit: compare score distributions across judete, CAEN codes, company sizes
- Annual third-party fairness review
- Continuous monitoring dashboard in Grafana

---

## 5. Transparency and Explainability (Art. 13)

### 5.1 API Endpoint

```
GET /api/v1/ai/decisions/:id/explanation
```

Returns structured explanation of any AI-assisted decision including:
- Input factors and their individual contributions
- Applied rules and thresholds
- Data sources consulted
- Human oversight status
- Appeal mechanism reference

### 5.2 User-Facing Documentation

- Clear labeling of AI-generated scores vs human-reviewed scores
- Risk category explanation text in Romanian
- Right to contest automated decisions (GDPR Art. 22 + AI Act Art. 86)

---

## 6. Accuracy and Robustness (Art. 15)

### 6.1 Performance Metrics (to be established)

| Metric                     | Target     | Measurement Frequency |
| -------------------------- | ---------- | --------------------- |
| Accuracy (overall)         | >= 85%     | Monthly               |
| False Positive Rate        | <= 10%     | Monthly               |
| False Negative Rate        | <= 5%      | Monthly               |
| Model drift detection      | < 5% shift | Weekly                |
| System availability        | >= 99.5%   | Continuous            |

### 6.2 Testing Requirements

- Unit tests for all scoring rules
- Integration tests with mock data sources
- Stress tests under high load (k6)
- Adversarial input testing for LLM components

---

## 7. Record-Keeping and Logging (Art. 12)

### 7.1 Audit Trail

Every credit scoring decision is logged with:
- Full input data snapshot (anonymized PII)
- Scoring algorithm version
- Individual factor scores
- Final composite score
- Decision outcome
- Timestamp and correlation ID
- OpenTelemetry trace ID for end-to-end tracing

### 7.2 Retention

- Scoring decisions: 5 years minimum (financial regulation compliance)
- Audit logs: immutable hash-chain (SHA-256) in `fiscal_audit_trail` table
- Model versions: indefinite retention with changelog

---

## 8. EU AI Database Registration (Art. 49)

Registration in the EU AI Database is required before placing the system on the market or putting it into service:

- **System name**: CerniqAPP Credit Scoring Module
- **Provider**: Cerniq SRL
- **Member State**: Romania
- **Risk classification**: HIGH-RISK (Annex III, 5b)
- **Status**: Pre-registration (to be completed before 2 August 2026)

---

## 9. Post-Market Monitoring (Art. 72)

- Continuous performance monitoring via Prometheus + Grafana
- Quarterly model performance review
- Annual comprehensive conformity re-assessment
- Incident reporting procedure (see `ai-act-incident-reporting.md`)
- User feedback mechanism via HITL approval rejections and overrides
