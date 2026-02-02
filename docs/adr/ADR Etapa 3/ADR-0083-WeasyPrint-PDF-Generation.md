# ADR-0083: PDF Generation cu WeasyPrint

**Status:** Accepted  
**Date:** 2026-01-18  
**Context:** Generare PDF pentru oferte comerciale, backup proforma/factură, și rapoarte.

**Decision:** **WeasyPrint** (Python) cu template-uri Jinja2:

- HTML templates în `templates/` directory
- CSS styling modular
- Generare bytes direct: `HTML(string=content).write_pdf()`
- Template components: header, client section, products table, totals, footer

**Use Cases:**

- Oferte comerciale personalizate
- Backup documente fiscale (în plus față de Oblio)
- Rapoarte agregat

**Consequences:**

- (+) Control complet asupra design
- (+) Flexibilitate template-uri
- (-) Dependență Python (deja avem pentru MCP)
