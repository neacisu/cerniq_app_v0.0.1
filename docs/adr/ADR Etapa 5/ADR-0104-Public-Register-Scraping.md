# ADR-0104: Association Data from Public Registers

**Status:** Accepted  
**Date:** 2026-01-19  
**Context:** Datele despre OUAI și Cooperative sunt în PDF-uri pe site-uri guvernamentale.

**Decision:** **PDF scraping pipeline**:

- Python cu tabula-py/pdfplumber pentru extracție
- Normalizare și reconciliere cu Termene.ro pentru CUI
- Source attribution: `source: PUBLIC_REGISTER`
- GDPR basis: Public interest / Legitimate interest B2B

**Consequences:**

- (+) Acces la date altfel inaccesibile
- (-) Fragile (depends on PDF format)
- (+) Legal safe (public data)
