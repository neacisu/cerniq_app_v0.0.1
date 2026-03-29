# AI Act Incident Reporting Procedure

| Field              | Value                                          |
| ------------------ | ---------------------------------------------- |
| Document Version   | 1.0.0                                          |
| Regulation         | Regulation (EU) 2024/1689, Art. 73             |
| System             | CerniqAPP Credit Scoring Module (HIGH-RISK)    |
| Last Review        | 2026-03-22                                     |

---

## 1. Scope

This procedure covers the reporting of serious incidents involving the CerniqAPP HIGH-RISK AI credit scoring system, as required by Art. 73 of the EU AI Act.

---

## 2. Definition of Serious Incident

A serious incident is any incident or malfunctioning that directly or indirectly leads to, or is likely to lead to:

1. **Death or serious damage to health** of a person (not typically applicable to credit scoring)
2. **Serious and irreversible disruption** of critical infrastructure management
3. **Breach of fundamental rights** obligations under Union law
4. **Serious harm** to property, environment, or public interests
5. **Systematic discriminatory outcomes** affecting protected groups

For CerniqAPP credit scoring, serious incidents include:
- Systematic bias causing unfair credit denial to a protected group
- Mass incorrect scoring affecting more than 100 companies simultaneously
- Data breach exposing scoring inputs or outputs
- Complete system failure lasting more than 24 hours
- LLM hallucination resulting in provably incorrect credit decisions at scale

---

## 3. Reporting Timeline

| Event                       | Deadline                                         |
| --------------------------- | ------------------------------------------------ |
| Incident detection          | T=0                                              |
| Internal notification       | T + 1 hour (engineering lead + DPO)              |
| Initial assessment          | T + 4 hours                                      |
| Authority notification      | T + 15 days (Art. 73(1)) or immediately if death |
| Root cause analysis         | T + 30 days                                      |
| Corrective action report    | T + 60 days                                      |

---

## 4. Notification Authorities

| Authority                      | Jurisdiction        | Contact Method         |
| ------------------------------ | ------------------- | ---------------------- |
| National market surveillance   | Romania (ANPC/ANCOM)| Electronic submission  |
| ANSPDCP (data protection)      | Romania             | If personal data breach|
| European AI Office             | EU                  | Via national authority |

---

## 5. Reporting Content (Art. 73(4))

Each serious incident report must include:

1. **Provider identification**: Cerniq SRL, CUI, contact details
2. **System identification**: CerniqAPP Credit Scoring Module, version, deployment
3. **Incident description**: Date, nature, scope, affected parties
4. **Root cause analysis**: Technical and organizational contributing factors
5. **Impact assessment**: Number of affected decisions, financial impact
6. **Corrective measures**: Immediate and long-term remediation steps
7. **Prevention plan**: Measures to prevent recurrence

---

## 6. Internal Incident Response

### 6.1 Severity Levels

| Level    | Criteria                                          | Response Time  |
| -------- | ------------------------------------------------- | -------------- |
| CRITICAL | Systematic discrimination, mass incorrect scoring | Immediate      |
| HIGH     | Individual incorrect decisions, partial failure    | 4 hours        |
| MEDIUM   | Performance degradation, increased error rate      | 24 hours       |
| LOW      | Minor anomalies, edge case issues                  | 72 hours       |

### 6.2 Response Team

| Role                | Responsibility                              |
| ------------------- | ------------------------------------------- |
| Engineering Lead    | Technical investigation and remediation     |
| DPO                 | Regulatory assessment and notification      |
| Legal Counsel       | Legal implications and authority liaison    |
| Product Owner       | Business impact and stakeholder comms       |
| CEO/CTO             | Final authority for CRITICAL incidents      |

### 6.3 Post-Incident Actions

1. Incident debrief within 48 hours of resolution
2. Root cause document added to `docs/audits/`
3. Corrective measures tracked in issue tracker
4. Model retrained if scoring logic was at fault
5. DPIA updated if risk profile has changed
6. Conformity assessment reviewed if systematic issue

---

## 7. Record Keeping

All incident reports and communications are retained for minimum 10 years in the immutable audit trail (`fiscal_audit_trail` table with SHA-256 hash chain).

---

## 8. Monitoring and Detection

Automated detection mechanisms:
- Prometheus alerts for scoring anomalies (sudden distribution shifts)
- Grafana dashboard for real-time scoring distribution monitoring
- Automated bias detection comparing scoring across protected attributes
- BullMQ DLQ monitoring for systematic processing failures
- OpenTelemetry trace analysis for error rate spikes
