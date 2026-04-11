# ADR-FAMILY-e3-fiscal-docs

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e3-fiscal-docs |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E3 |
| Familie | `fiscal-docs` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e3-fiscal-docs` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Documente fiscale și comerciale în E3: Oblio, e-Factura/SPV, generare PDF, trimitere email/WhatsApp, arhivare.

## Dovezi confirmate în Cerniq

### Oblio + eFactura + documente (catalog; cozi = registry)

| Grup | nodeKey (eșantion) | Coadă |
| --- | --- | --- |
| Oblio | `e3:oblio:proforma-create` … `e3:oblio:webhook-process` | `oblio:*` |
| eFactura | `e3:einvoice:send` … `e3:einvoice:retry-failed` | `einvoice:*` |
| PDF / livrare | `e3:document:pdf-generate` … `e3:document:archive-store` | `document:*` |

- Registry: secțiunile G, H, I din `queue-registry.ts` (E3) — aceleași literali.

### Export graf (v2)

- **10** neuroni; exemple: `document:email:send`, `document:pdf:generate`, `document:template:compile`, `document:whatsapp:send`, `einvoice:archive:download`, `oblio:invoice:cancel`.

### Reconciliere

- Aliniere bună între v2 exemple și cozi `oblio:*`, `einvoice:*`, `document:*`.

## Decizie de guvernanță familială

1. **Proprietar:** E3 Fiscal / Legal.
2. **Capabilitate:** conformitate termene SPV (v2 menționează obligații — **verificare legală** separată de cod).
3. **Telemetrie:** **CRITICAL** pe `einvoice:send`, `einvoice:deadline:monitor`.
4. **Guardrail:** `e3:guardrail:fiscal-validate` (familie separată) susține acest perimetru.

## Research extern

- Reglementări ANAF / e-Factura: **numai** cu surse oficiale verificate la data lucrului; nu înlocuiesc consultanță juridică.

## Limită evidență

- Comportament la respingere SPV: din worker și runbook operațional.
