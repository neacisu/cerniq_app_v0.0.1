# CERNIQ.APP — Redis DB Assignment Matrix

## Infrastructure Reference

### Versiunea 1.0 | 01 Februarie 2026

---

## Scope

Acest document definește alocarea canonică a bazei Redis (`REDIS_DB`) pe etape, pentru a evita coliziuni între workers și a separa workload-urile.

## Alocare Canonica pe Etapă

| Etapă | Servicii | Redis DB | Motiv | Observații |
|------|----------|----------|-------|-----------|
| Etapa 0 | Infra shared (queues, cache, locks) | 0 | Baseline infrastructure | Default pentru bootstrap |
| Etapa 1 | Data Enrichment | 1 | Separare Bronze/Silver/Gold | Workers ingest + enrich |
| Etapa 2 | Cold Outreach | 2 | Separare comunicare | Quota/phones/sequence |
| Etapa 3 | AI Sales Agent | 3 | Separare AI + negotiation | MCP, guardrails, FSM |
| Etapa 4 | Payments & Logistics | 4 | Separare post-vânzare | Revolut, Sameday, RMA |
| Etapa 5 | Analytics & BI | 5 | Separare reporting | Dashboards + ETL |

## Reguli de Utilizare

- `REDIS_DB` este setat per serviciu în `.env`/secrets.
- Nu se reutilizează DB-ul altei etape fără aprobare.
- Pentru workload temporar, folosiți namespace în chei, nu un DB nou.

## Referințe

- [Etapa 0 — Environment Variables](../specifications/Etapa%200/etapa0-environment-variables.md)
- [Redis High Availability](./redis-high-availability.md)

---

**Document tip:** Infrastructure Reference  
**Actualizat:** 01 Februarie 2026
