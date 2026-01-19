# CERNIQ.APP — ETAPA 5: ARCHITECTURE DECISION RECORDS
## ADRs pentru Nurturing Agentic
### Versiunea 1.0 | 19 Ianuarie 2026

---

## ADR-E5-001: Nurturing State Machine Design

### Status: ACCEPTED

### Context
Clienții post-conversie necesită tracking al ciclului de viață cu tranziții automate și manuale.

### Decision
Adoptăm **finite state machine** cu 7 stări și tranziții bazate pe reguli și AI.

```
States: ONBOARDING → NURTURING_ACTIVE ↔ AT_RISK → CHURNED → REACTIVATED
                  ↓
             LOYAL_CLIENT → ADVOCATE
```

### Consequences
- Tranziții clare și auditabile
- Permite atât automation cât și HITL override
- Complexity în edge cases

---

## ADR-E5-002: Churn Detection via Multi-Signal AI

### Status: ACCEPTED

### Context
Detectarea timpurie a riscului de churn necesită analiză multi-dimensională.

### Decision
**Multi-signal weighted scoring** cu:
- LLM sentiment analysis pe conversații
- Rule-based signals (payment delays, order frequency)
- Behavioral decay patterns

Formula: `ChurnScore = Σ(signal_strength × weight × confidence)`

### Consequences
- Detectare proactivă înainte de churn efectiv
- Cost LLM pentru sentiment analysis
- Necesită calibrare periodică a weights

---

## ADR-E5-003: PostGIS for Geospatial Proximity

### Status: ACCEPTED

### Context
Strategia "Neighborhood Referral" necesită identificarea vecinilor geografici.

### Decision
Utilizăm **PostGIS KNN queries** cu:
- GEOGRAPHY type pentru calcule geodezice precise
- GiST indexes pentru performanță
- `<->` operator pentru nearest neighbor optimizat

### Consequences
- Queries rapide pentru proximity (< 100ms pentru 10K records)
- Acuratețe geodezică în zone rurale extinse
- Complexity în index maintenance

---

## ADR-E5-004: NetworkX/Leiden for Community Detection

### Status: ACCEPTED

### Context
Identificarea clusterelor implicite necesită graph algorithms.

### Decision
**Python service cu NetworkX + Leiden algorithm**:
- Leiden preferat Louvain (garantează comunități conectate)
- cdlib pentru implementare
- Scheduled batch processing (nu real-time)

### Consequences
- Detectează clustere non-evidente
- CPU intensive - rulează ca batch job
- Necesită Python 3.14 free-threading

---

## ADR-E5-005: GDPR Consent-First Referral Flow

### Status: ACCEPTED

### Context
Referral-urile necesită consimțământ explicit conform GDPR.

### Decision
**Consent-first flow**:
1. Detectăm mențiune în conversație
2. Cerem consimțământ explicit de la referrer
3. Doar după aprobare contactăm referred
4. Auditare completă a lanțului de consimțământ

### Consequences
- Conformitate GDPR 100%
- Friction în flow (reduce conversion rate)
- Full audit trail

---

## ADR-E5-006: Competition Law Safe Harbor for Intel

### Status: ACCEPTED

### Context
Colectarea de competitive intelligence trebuie să respecte Legea Concurenței.

### Decision
**Safe harbor constraints**:
- NU stocăm prețuri specifice ale competitorilor
- DOAR statistici agregate (medii regionale)
- Prompt constraints pentru LLM: "Nu dezvălui termeni comerciali specifici"
- Compliance review obligatoriu pentru price intel

### Consequences
- Conformitate cu Competition Law
- Limitează granularitatea intel
- Requires compliance worker validation

---

## ADR-E5-007: Association Data from Public Registers

### Status: ACCEPTED

### Context
Datele despre OUAI și Cooperative sunt în PDF-uri pe site-uri guvernamentale.

### Decision
**PDF scraping pipeline**:
- Python cu tabula-py/pdfplumber pentru extracție
- Normalizare și reconciliere cu Termene.ro pentru CUI
- Source attribution: `source: PUBLIC_REGISTER`
- GDPR basis: Public interest / Legitimate interest B2B

### Consequences
- Acces la date altfel inaccesibile
- Fragile (depends on PDF format)
- Legal safe (public data)

---

## ADR-E5-008: KOL Identification via Graph Centrality

### Status: ACCEPTED

### Context
Identificarea Key Opinion Leaders necesită metrici de influență.

### Decision
**Multi-metric centrality scoring**:
- Degree centrality (connections count)
- Betweenness (bridge between communities)
- Eigenvector (connection to important nodes)
- PageRank (influence propagation)

Formula: `KOL_Score = 0.3×degree + 0.3×betweenness + 0.2×eigenvector + 0.2×pagerank`

### Consequences
- Identificare obiectivă a influencers
- Requires graph building first
- May miss offline influence

---

## ADR-E5-009: Win-Back Campaign Orchestration

### Status: ACCEPTED

### Context
Recuperarea clienților churned necesită campanii multi-step.

### Decision
**Step-based campaign engine**:
- Template strategies bazate pe customer value
- Delayed job scheduling pentru steps
- HITL pentru high-value clients
- Offer management integrat

### Consequences
- Sistematizare a win-back
- Requires offer approval workflow
- Tracking ROI per campaign

---

## ADR-E5-010: Real-Time Sentiment via Streaming

### Status: ACCEPTED

### Context
Sentiment analysis trebuie să fie aproape real-time pentru churn detection.

### Decision
**Event-driven sentiment pipeline**:
- Webhook receive message → Queue sentiment job
- LLM analysis în < 30 seconds
- Immediate churn signal if negative
- Batching pentru cost optimization

### Consequences
- Fast feedback loop pentru churn
- LLM costs scale with messages
- Rate limiting pentru cost control

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
