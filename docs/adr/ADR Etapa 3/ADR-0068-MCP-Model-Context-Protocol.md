# ADR-0068: Model Context Protocol (MCP) pentru Tool Access

**Status:** Accepted  
**Date:** 2026-01-18  
**Context:** LLM-ul trebuie să acceseze date din PostgreSQL și să execute acțiuni. Opțiuni: direct SQL (risc), custom tool API, sau MCP standard.

**Decision:** Adoptăm **MCP** (Model Context Protocol) — standard deschis Anthropic:

**Resources (read-only):**

- `product://{sku}` → Golden Record produs
- `client://{cif}` → Date client din DB
- `conversation://{lead_id}` → Istoric conversație
- `catalog://category/{cat}` → Produse din categorie

**Tools (execute):**

- `search_products(query, filters)` → Hybrid Search
- `check_realtime_stock(sku)` → Verificare stoc ERP
- `calculate_discount(sku, qty, client)` → Calcul discount maxim
- `create_proforma(client, products)` → Emite proforma Oblio
- `convert_to_invoice(proforma_ref)` → Conversie în factură
- `send_einvoice(invoice_ref)` → Trimite în SPV

**Consequences:**

- (+) Securitate: LLM nu execută SQL direct
- (+) Portabilitate: MCP e standard deschis
- (+) Observabilitate: Toate tool calls sunt logate
