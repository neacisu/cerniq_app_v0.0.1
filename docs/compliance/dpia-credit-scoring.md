# Data Protection Impact Assessment (DPIA) — AI Credit Scoring

| Field              | Value                                          |
| ------------------ | ---------------------------------------------- |
| Document Version   | 1.0.0                                          |
| Legal Basis        | GDPR Art. 35, Art. 22; EU AI Act Art. 9, 26    |
| System             | CerniqAPP Credit Scoring Module (E4)           |
| DPO Contact        | dpo@cerniq.ro                                  |
| Last Review        | 2026-03-22                                     |

---

## 1. Processing Description

### 1.1 Nature of Processing

Automated processing of company and personal data to generate credit risk scores, determine credit limits, and assign payment terms for B2B transactions.

### 1.2 Scope

- **Data subjects**: Company administrators, shareholders, and legal representatives (natural persons associated with scored companies)
- **Data categories**: Company financial data, fiscal status, payment history, insolvency records, legal proceedings, administrator/shareholder identity
- **Volume**: Estimated 50,000-200,000 company records
- **Geography**: Romania (EU member state)

### 1.3 Context

B2B agricultural supply chain credit assessment. The scoring system assists sales and finance teams in determining whether to extend credit and under what terms.

### 1.4 Purpose

- Risk assessment for credit extension decisions
- Payment terms optimization
- Portfolio risk monitoring
- Regulatory compliance (prudent lending)

---

## 2. Necessity and Proportionality

### 2.1 Legal Basis

| Processing Activity       | Legal Basis (GDPR)       | Justification                              |
| ------------------------- | ------------------------ | ------------------------------------------ |
| Company financial scoring | Art. 6(1)(f) Legitimate  | Necessary for credit risk management       |
| Personal data (admins)    | Art. 6(1)(f) Legitimate  | Necessary to assess company governance     |
| Automated decision-making | Art. 22(2)(a) Contract   | Pre-contractual step for credit terms      |

### 2.2 Proportionality Assessment

- Scoring uses minimum necessary data for credit assessment
- No processing of special categories (Art. 9)
- Human override available for all automated decisions
- Data minimization applied: only financial/fiscal data relevant to creditworthiness

---

## 3. Risk Assessment

### 3.1 Risk Matrix

| Risk                               | Likelihood | Impact  | Level  | Mitigation                            |
| ---------------------------------- | ---------- | ------- | ------ | ------------------------------------- |
| Unfair credit denial               | Medium     | High    | HIGH   | HITL approval, bias monitoring        |
| Data accuracy errors               | Medium     | Medium  | MEDIUM | Multi-source cross-validation         |
| Model bias (geographic/sector)     | Low        | High    | MEDIUM | Quarterly bias audits                 |
| Unauthorized data access           | Low        | High    | MEDIUM | RBAC, audit logs, encryption          |
| LLM hallucination in scoring       | Medium     | High    | HIGH   | Consensus voting, guardrails          |
| Re-identification from embeddings  | Low        | Medium  | LOW    | Embeddings not reversible             |
| Score manipulation via input       | Low        | High    | MEDIUM | Input validation, anomaly detection   |

### 3.2 Data Subject Rights

| Right                    | Implementation                                         |
| ------------------------ | ------------------------------------------------------ |
| Access (Art. 15)         | GET /api/v1/ai/decisions/:id/explanation                |
| Rectification (Art. 16)  | Manual data correction via admin panel                  |
| Erasure (Art. 17)        | Nullify embeddings; retain anonymized audit for 5 years |
| Object (Art. 21)         | Opt-out flag; manual scoring alternative                |
| Not be subject to        | HITL mandatory for all decisions above threshold        |
| automated decision (22)  | Human override capability at all levels                 |
| Explanation (AI Act)     | Structured explanation endpoint with factor breakdown   |

---

## 4. Safeguards and Mitigations

### 4.1 Technical Measures

- **Encryption**: TLS in transit, AES-256 at rest
- **Access control**: Role-based (RBAC) with minimum privilege
- **Audit logging**: Immutable hash-chain (SHA-256) for all credit decisions
- **Secret management**: OpenBao vault for API keys and credentials
- **LLM safeguards**: LLM Guard input/output scanning, sensitive data stays on self-hosted models
- **Observability**: Full OpenTelemetry tracing, Prometheus metrics, Grafana dashboards

### 4.2 Organizational Measures

- Designated DPO oversight
- Quarterly model performance and bias reviews
- Staff training on AI ethics and credit assessment
- Incident response procedure with 72-hour notification obligation
- Annual DPIA review and update

### 4.3 Human Oversight (AI Act Art. 14)

- All high-risk scoring decisions require human approval
- Credit analysts can override any automated decision
- Escalation path: Analyst -> Manager -> VP Finance
- Decision explanation available to both operator and affected company

---

## 5. Consultation

### 5.1 Internal Consultation

- Engineering team: Technical feasibility and security measures
- Legal team: Regulatory compliance assessment
- Finance team: Business requirements and accuracy expectations

### 5.2 External Consultation

- Data Protection Authority (ANSPDCP) notification if residual high risk remains
- Annual third-party audit of scoring fairness

---

## 6. Review Schedule

| Review Type                  | Frequency  | Responsible         |
| ---------------------------- | ---------- | ------------------- |
| DPIA comprehensive review    | Annual     | DPO + Legal         |
| Bias audit                   | Quarterly  | Data Science + DPO  |
| Model performance review     | Monthly    | Engineering         |
| Incident review              | Per event  | DPO + Engineering   |
| Regulatory compliance check  | Semi-annual| Legal               |
