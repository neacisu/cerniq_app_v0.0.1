# ADR-0033: Arhitectură Medallion Bronze-Silver-Gold

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Necesitatea structurării datelor în pipeline de enrichment multi-etapă cu trasabilitate completă.

**Decision:** Adoptăm arhitectura Medallion (Bronze → Silver → Gold):

- **Bronze Layer**: Date brute, append-only, imuabil, zero transformări
- **Silver Layer**: Date curățate, validate, deduplicate, partial enriched
- **Gold Layer**: Date complete, ready-for-outreach, cu scoring și FSM

**Consequences:**

- (+) Trasabilitate completă din source până la utilizare
- (+) Reprocessare posibilă de la orice punct
- (+) Separare clară responsabilități
- (-) Storage overhead (3x pentru date complete)
- (-) Complexitate pipeline

**Compliance:** GDPR Art.5(1)(e) - minimizare stocare prin TTL pe Bronze
