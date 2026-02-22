# PDF Generation Pattern — Invoices & Reports

**Priority:** HIGH | **Version:** 1.0 | **February 2026**

## Overview

This pattern covers PDF generation for invoices and reports: python-pdf service (port 64076), template system, e-Factura XML generation, TVA 24% calculations, and compliance with Romanian fiscal regulations.

---

## 1. Python PDF Service

- **Port:** 64076 (reserved in port matrix)
- **Stack:** Python (e.g. WeasyPrint, ReportLab, or Jinja2 + wkhtmltopdf)
- **API:** REST endpoint `POST /generate` with template name + JSON data

```http
POST http://cerniq-pdf:64076/generate
Content-Type: application/json

{
  "template": "invoice",
  "data": { "invoiceId": "INV-001", "lines": [...], "company": {...} }
}
```

Response: PDF binary or base64.

---

## 2. Template System

- **Location:** `templates/pdf/` (invoice.html, report.html)
- **Engine:** Jinja2
- **Variables:** Company details, invoice lines, totals, TVA breakdown

Template structure:
- Header: logo, company name, CUI, address
- Body: invoice lines with description, quantity, unit price, TVA, total
- Footer: payment terms, bank details, legal mentions

---

## 3. e-Factura XML Generation

Romanian e-Factura requires XML in ANAF format (UBL 2.1 or national schema).

- **Standard:** Factura electronica (format ANAF)
- **Fields:** CUI (furnizor, client), serie, număr, dată, linii, TVA, total
- **Transmission:** ANAF API or MFactura platform

Generate XML in API or dedicated worker; pass to python-pdf for PDF rendering. XML and PDF are separate artifacts.

---

## 4. TVA 24% Calculations

Romanian standard TVA rate: **24%** (2026).

```typescript
const TVA_RATE = 0.24;
const netAmount = grossAmount / (1 + TVA_RATE);
const vatAmount = grossAmount - netAmount;
```

For invoice lines:
- `line_net = line_gross / 1.24`
- `line_vat = line_gross - line_net`
- Round to 2 decimals per line; adjust last line for rounding.

---

## 5. Compliance with Romanian Fiscal Regulations

- **Serie și număr factură:** Consecutive, unique per company
- **CUI:** Valid ANAF format (8 digits for companies)
- **Data emiterii:** Must match submission date
- **TVA:** 24% standard; 9%, 5% for reduced rates (food, medicine, etc.)
- **Monedă:** RON for domestic; EUR allowed for export
- **Retention:** Document retention 10 years (digital storage)

---

## 6. Integration Flow

1. API receives request to generate invoice
2. Fetch invoice data from DB
3. Enqueue BullMQ job `doc:pdf:invoice`
4. Worker calls python-pdf service
5. Store PDF in S3 or local; optionally submit e-Factura XML to ANAF
6. Return download URL or attach to email

---

## 7. Python Service API Contract

```http
POST /generate
Content-Type: application/json

{
  "template": "invoice",
  "data": {
    "invoiceNumber": "F-2026-001",
    "issueDate": "2026-02-22",
    "seller": { "name": "Cerniq SRL", "cui": "12345678", "address": "..." },
    "buyer": { ... },
    "lines": [ { "description": "...", "qty": 1, "unitPrice": 100, "vatRate": 24 } ],
    "totalNet": 80.65,
    "totalVat": 19.35,
    "totalGross": 100
  }
}
```

Response: `Content-Type: application/pdf`, binary body.

---

## 8. Error Handling

- **Template not found:** 404 from python-pdf
- **Invalid data:** 400 with validation errors
- **Service down:** Circuit breaker, retry, fallback to "generating" status

---

## 9. Report Templates

Besides invoices: lead reports, activity reports, analytics. Same python-pdf service, different template names. Pass chart data as base64 or URL if needed.

---

## 10. Romanian Legal Footer

Include in invoice PDF:
- "Factura este emisă în baza Legii 227/2015"
- Company registration (J40/1234/2020)
- Bank details (IBAN)
- Payment terms (e.g. 14 zile)

---

## 11. Related Documents

- `worker-pool-sizing.md` — PDF worker concurrency (CPU-bound)
- `data-export.md` — PDF export flow
- `docs/specifications/Etapa 3/etapa3-workers-H-efactura-spv.md` — e-Factura spec

---

## Checklist

- [ ] Python PDF service on port 64076
- [ ] Jinja2 templates for invoice/report
- [ ] e-Factura XML generation
- [ ] TVA 24% calculation correct
- [ ] Romanian fiscal compliance
- [ ] Async via BullMQ
- [ ] Error handling and circuit breaker
- [ ] Legal footer in templates
