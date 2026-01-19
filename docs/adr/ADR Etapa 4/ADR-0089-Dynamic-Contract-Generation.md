# ADR-0089: Dynamic Contract Generation

**Status:** Accepted  
**Date:** 2026-01-19  
**Context:** Contractele trebuie generate dinamic pe baza risk tier-ului clientului cu clauze specifice.

**Decision:** Sistem de **template-based contract generation**:

- Templates DOCX cu Jinja2 placeholders
- Clause library cu dependencies și conflicts
- Python docxtpl pentru generare
- LibreOffice headless pentru PDF conversion
- DocuSign pentru semnături digitale

**Consequences:**

- (+) Flexibilitate în personalizare
- (+) Audit trail pentru clauze folosite
- (+) Conformitate legală asigurată
- (-) Complexitate workflow
- (-) Dependență DocuSign (cost)
