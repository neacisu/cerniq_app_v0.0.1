# CERNIQ.APP — Referințe Tehnice Externe

## Documentație Oficială pentru Stack-ul Tehnologic

**Actualizat:** 20 Ianuarie 2026

---

## 1. CORE RUNTIME

| Tehnologie | Versiune | Documentație |
| ---------- | -------- | ------------ |
| **Node.js** | 24.x (LTS) | [Documentation](https://nodejs.org/en/docs/) |
| **Python** | 3.14 (Free-Threading) | [PEP 703](https://peps.python.org/pep-0703/) |
| **TypeScript** | 5.8+ | [Handbook](https://www.typescriptlang.org/docs/) |

---

## 2. DATABASES & QUEUES

### PostgreSQL Ecosystem

| Component | Versiune | Link |
| --------- | -------- | ---- |
| **PostgreSQL** | 18.1 | [Manual](https://www.postgresql.org/docs/current/) |
| **pgvector** | 0.8.0 | [GitHub](https://github.com/pgvector/pgvector) |
| **PostGIS** | 3.5 | [Documentation](https://postgis.net/documentation/) |
| **pg_trgm** | Built-in | [Docs](https://www.postgresql.org/docs/current/pgtrgm.html) |
| **Drizzle ORM** | 0.40+ | [Docs](https://orm.drizzle.team/docs/overview) |

### Redis & Queues

| Component | Versiune | Link |
| --------- | -------- | ---- |
| **Redis** | 8.0 | [Commands](https://redis.io/commands/) |
| **BullMQ** | 5.66.5 | [Guide](https://docs.bullmq.io/) |
| **Redis Sentinel** | Built-in | [Docs](https://redis.io/docs/management/sentinel/) |

---

## 3. FRAMEWORKS & API

### Backend

| Framework | Versiune | Link |
| --------- | -------- | ---- |
| **Fastify** | v5.6.2 | [Documentation](https://fastify.dev/docs/latest/) |
| **Zod** | 3.x | [Docs](https://zod.dev/) |
| **OpenTelemetry SDK** | 1.x | [JS SDK](https://opentelemetry.io/docs/languages/js/) |

### Frontend

| Framework | Versiune | Link |
| --------- | -------- | ---- |
| **React** | 19.2.3 | [React 19 Blog](https://react.dev/blog/2024/12/05/react-19) |
| **Refine** | v5 | [Documentation](https://refine.dev/docs/) |
| **Tailwind CSS** | v4.1 | [Docs](https://tailwindcss.com/docs) |
| **shadcn/ui** | Latest | [Components](https://ui.shadcn.com/) |
| **TanStack Query** | v5 | [Docs](https://tanstack.com/query/latest) |
| **TanStack Router** | v1 | [Docs](https://tanstack.com/router/latest) |

---

## 4. INFRASTRUCTURE & DEVOPS

| Tool | Versiune | Link |
| ---- | -------- | ---- |
| **Docker Engine** | 29.1.3 | [Reference](https://docs.docker.com/reference/) |
| **Docker Compose** | v2 | [Compose Spec](https://docs.docker.com/compose/compose-file/) |
| **Traefik** | v3.6.6 | [Documentation](https://doc.traefik.io/traefik/) |
| **SigNoz** | v0.107.0 | [Docs](https://signoz.io/docs/) |
| **Turborepo** | 2.x | [Docs](https://turbo.build/repo/docs) |
| **pnpm** | 9.x | [Docs](https://pnpm.io/) |
| **BorgBackup** | 1.4+ | [Docs](https://borgbackup.readthedocs.io/) |

---

## 5. TESTING TOOLS

| Tool | Purpose | Link |
| ---- | ------- | ---- |
| **Vitest** | Unit & Integration | [Docs](https://vitest.dev/) |
| **Playwright** | E2E Browser | [Docs](https://playwright.dev/) |
| **k6** | Load Testing | [Docs](https://k6.io/docs/) |
| **Pact** | Contract Testing | [Docs](https://docs.pact.io/) |
| **Pumba** | Chaos Engineering | [GitHub](https://github.com/alexei-led/pumba) |
| **MSW** | API Mocking | [Docs](https://mswjs.io/) |

---

## 6. EXTERNAL APIS (PROVIDERS)

### Romanian Government & Business

| API | Purpose | Link |
| --- | ------- | ---- |
| **ANAF SPV** | e-Factura, TVA validation | [Ghid Tehnic](https://mfinante.gov.ro/ro/web/etax/informatii-tehnice) |
| **ANAF Web Services** | Company data | [API Docs](https://static.anaf.ro/static/10/Anaf/Informatii_publice/) |
| **Termene.ro** | Court cases, associates | [Website](https://termene.ro/) |
| **ONRC** | Official company registry | [Portal](https://portal.onrc.ro/) |

### Messaging & Email

| API | Purpose | Link | Rate Limit |
| --- | ------- | ---- | ---------- |
| **TimelinesAI** | WhatsApp Business | [API Reference](https://timelines.ai/api-reference/) | 200/day/phone |
| **Resend** | Transactional email | [Docs](https://resend.com/docs) | 500/hour |
| **Instantly.ai** | Email warmup | [API v2](https://developer.instantly.ai/) | Varies |

### Payments & Logistics

| API | Purpose | Link |
| --- | ------- | ---- |
| **Revolut Business** | Payments | [API Docs](https://developer.revolut.com/docs/business/) |
| **Sameday** | Courier | [API Portal](https://sameday.ro/business/integrare-api) |
| **Oblio.eu** | Invoicing | [API Docs](https://www.oblio.eu/api) |

### AI & ML

| API | Purpose | Link |
| --- | ------- | ---- |
| **OpenAI** | GPT-4o, Embeddings | [API Reference](https://platform.openai.com/docs/api-reference) |
| **Anthropic** | Claude (fallback) | [Docs](https://docs.anthropic.com/) |

---

## 7. ROMANIAN REGULATIONS

| Regulament | Scope | Link |
| ---------- | ----- | ---- |
| **GDPR (EU 2016/679)** | Data protection | [EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj) |
| **Legea 190/2018** | GDPR implementation RO | [Legislatie.just.ro](http://legislatie.just.ro/) |
| **e-Factura** | Electronic invoicing | [ANAF](https://www.anaf.ro/anaf/internet/ANAF/info_publice/e_factura) |
| **Cod Fiscal** | Tax regulations | [Legislatie.just.ro](http://legislatie.just.ro/) |

---

## 8. INDUSTRY STANDARDS

| Standard | Purpose | Link |
| -------- | ------- | ---- |
| **OpenAPI 3.1** | API specification | [Spec](https://spec.openapis.org/oas/v3.1.0) |
| **OAuth 2.0** | Authorization | [RFC 6749](https://tools.ietf.org/html/rfc6749) |
| **JWT** | Token format | [RFC 7519](https://tools.ietf.org/html/rfc7519) |
| **UBL 2.1** | e-Invoice format | [OASIS](https://docs.oasis-open.org/ubl/UBL-2.1.html) |
| **E.164** | Phone number format | [ITU-T](https://www.itu.int/rec/T-REC-E.164) |
| **ISO 8601** | Date/time format | [ISO](https://www.iso.org/iso-8601-date-and-time-format.html) |

---

**Actualizat:** 20 Ianuarie 2026
