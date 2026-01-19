# ADR-0072: Oblio.eu pentru Facturare

**Status:** Accepted  
**Date:** 2026-01-18  
**Context:** Sistemul trebuie să emită documente fiscale valide în România: proforma, factură fiscală, integrare cu e-Factura ANAF.

**Decision:** **Oblio.eu** ca provider facturare:

- API REST complet documentat
- Suport nativ e-Factura
- Generare PDF automată
- Plan gratuit cu abonament (60 req/min)

**Integration Points:**

- `createDoc()` — Creare proforma/factură
- `convertProformaToInvoice()` — Conversie cu auto-send SPV
- Series management: PRF (proforma), FCT (factură)

**Consequences:**

- (+) Compliance fiscal asigurat
- (+) Reducere cod custom pentru PDF
- (-) Dependență de serviciu extern (mitigat cu retry)
