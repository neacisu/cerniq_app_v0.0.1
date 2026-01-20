# CERNIQ.APP — Diagrams Catalog

## Documentație Diagrame Arhitecturale

**Locație:** `docs/diagrams/`  
**Format:** Draw.io (`.drawio`)  
**Actualizat:** 20 Ianuarie 2026

---

## CATALOG DIAGRAME

| Fișier | Tip | Descriere | Referențe |
| ------ | --- | --------- | --------- |
| [`c4-context.drawio`](./c4-context.drawio) | C4 Level 1 | Context diagram - Cerniq în ecosistem | [architecture.md](../architecture/architecture.md) |
| [`c4-containers.drawio`](./c4-containers.drawio) | C4 Level 2 | Container diagram - Servicii Docker | [docker-compose-reference.md](../infrastructure/docker-compose-reference.md) |
| [`c4-components-etapa1.drawio`](./c4-components-etapa1.drawio) | C4 Level 3 | Components Etapa 1 Data Enrichment | [Etapa 1 Specs](../specifications/Etapa%201/) |
| [`data-flow-medallion.drawio`](./data-flow-medallion.drawio) | Data Flow | Bronze → Silver → Gold pipeline | [ADR-0031](../adr/ADR%20Etapa%201/ADR-0031-Bronze-Silver-Gold.md) |
| [`deployment-infrastructure.drawio`](./deployment-infrastructure.drawio) | Infrastructure | Hetzner bare-metal deployment | [deployment-guide.md](../infrastructure/deployment-guide.md) |
| [`geospatial-nurturing.drawio`](./geospatial-nurturing.drawio) | Data Model | PostGIS proximity & graph analysis | [Etapa 5 Specs](../specifications/Etapa%205/) |
| [`runtime-ai-negotiation-sequence.drawio`](./runtime-ai-negotiation-sequence.drawio) | Sequence | AI Agent negotiation flow (XState) | [ADR-0074](../adr/ADR%20Etapa%203/ADR-0074-XState-Negotiation.md) |
| [`runtime-cold-outreach-sequence.drawio`](./runtime-cold-outreach-sequence.drawio) | Sequence | Cold outreach sequence engine | [Etapa 2 Specs](../specifications/Etapa%202/) |

---

## DETALII DIAGRAME

### C4 Model (3 Niveluri)

#### Level 1: System Context

```text
┌─────────────────────────────────────────────────────────────┐
│                        CONTEXT                              │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│  Fermier │ Operator │   ANAF   │Termene.ro│   TimelinesAI   │
│  (User)  │  (Admin) │   (API)  │  (API)   │    (WhatsApp)   │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴────────┬────────┘
     │          │          │          │              │
     └──────────┴──────────┴──────────┴──────────────┘
                           │
                    ┌──────▼──────┐
                    │  CERNIQ.APP │
                    │   System    │
                    └─────────────┘
```

#### Level 2: Containers

- **Web Admin** (React 19)
- **API** (Fastify 5.6)
- **Workers** (BullMQ 313)
- **PostgreSQL** (18.1)
- **Redis** (8.0)
- **SigNoz** (Observability)

#### Level 3: Components (Etapa 1 Example)

- Ingest Workers (A)
- Normalize Workers (B)
- Validate Workers (C)
- ANAF Workers (D)
- Termene Workers (E)
- ...

---

### Sequence Diagrams

#### AI Negotiation Flow

1. User sends message → WhatsApp webhook
2. Agent processes with LLM (Grok-4/GPT-4o)
3. Tool calls: searchProducts, checkStock, calculatePrice
4. Guardrails validate response
5. Send reply → WhatsApp

#### Cold Outreach Sequence

1. Lead enters sequence
2. Email step → Wait 1d
3. WhatsApp step → Wait 2d
4. Check response → Branch
5. Loop or exit

---

## EDITARE DIAGRAME

### Tool Recomandat

[Draw.io Desktop](https://github.com/jgraph/drawio-desktop/releases) sau [diagrams.net](https://app.diagrams.net/)

### Convenții

1. **Culori Standard:**
   - Albastru: Services
   - Verde: Databases
   - Orange: External APIs
   - Roșu: Critical path

2. **Font:** Inter sau system default

3. **Export:** Păstrează `.drawio` pentru editare, exportă `.png` pentru docs

---

## STATUS REVIEW

| Diagramă | Ultima Actualizare | Reviewer | Status |
| -------- | ------------------ | -------- | ------ |
| c4-context | 2026-01-15 | - | ✅ Current |
| c4-containers | 2026-01-15 | - | ✅ Current |
| c4-components-etapa1 | 2026-01-15 | - | ✅ Current |
| data-flow-medallion | 2026-01-15 | - | ✅ Current |
| deployment-infrastructure | 2026-01-15 | - | ✅ Current |
| geospatial-nurturing | 2026-01-15 | - | ✅ Current |
| runtime-ai-negotiation | 2026-01-15 | - | ✅ Current |
| runtime-cold-outreach | 2026-01-15 | - | ✅ Current |

---

## DOCUMENTE CONEXE

- [Architecture Overview](../architecture/architecture.md)
- [Master Specification](../specifications/master-specification.md)
- [ADR Index](../adr/ADR-INDEX.md)

---

**Actualizat:** 20 Ianuarie 2026
