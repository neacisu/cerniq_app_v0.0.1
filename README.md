# CERNIQ.APP

**B2B Sales Automation Platform** — AI-powered lead enrichment, cold outreach, and sales pipeline optimization.

[![CI Pipeline](https://github.com/neacisu/cerniq_app_v0.0.1/actions/workflows/ci-pr.yml/badge.svg)](https://github.com/neacisu/cerniq_app_v0.0.1/actions/workflows/ci-pr.yml)
[![CD Pipeline](https://github.com/neacisu/cerniq_app_v0.0.1/actions/workflows/deploy.yml/badge.svg)](https://github.com/neacisu/cerniq_app_v0.0.1/actions/workflows/deploy.yml)

## 🚀 Quick Start

### Prerequisites

- **Node.js** 24.x LTS
- **PNPM** 9.x
- **Docker** 28.x+
- **Docker Compose** v2.20+

### Development Setup

```bash
# Clone repository
git clone https://github.com/neacisu/cerniq_app_v0.0.1.git
cd cerniq_app_v0.0.1

# Install dependencies
pnpm install

# Run tests
pnpm test

# Type check
pnpm typecheck
```

### Infrastructure Validation

```bash
# Run local infrastructure tests
pnpm test:infra

# Test staging server
pnpm test:infra:remote:staging

# Test production server  
pnpm test:infra:remote:production
```

## 📁 Project Structure

```
/var/www/CerniqAPP/
├── apps/                    # Application packages
│   ├── api/                 # Fastify API server
│   ├── web/                 # React frontend
│   ├── web-admin/           # Admin dashboard
│   └── monitoring-api/      # Monitoring API
├── packages/                # Shared packages
│   ├── db/                  # Drizzle ORM + schema
│   ├── shared-types/        # TypeScript types
│   ├── config/              # Shared configs
│   └── observability/       # Telemetry utilities
├── workers/                 # Background workers
│   ├── ai/                  # AI processing worker
│   ├── enrichment/          # Data enrichment
│   ├── outreach/            # Cold outreach automation
│   └── monitoring/          # System monitoring
├── infra/                   # Infrastructure as Code
│   ├── docker/              # Docker Compose configs
│   ├── scripts/             # Automation scripts
│   └── config/              # Service configurations
├── docs/                    # Documentation
│   ├── adr/                 # Architecture Decision Records
│   ├── architecture/        # System architecture
│   ├── api/                 # API specifications
│   └── runbooks/            # Operational guides
└── tests/                   # Test suites
    ├── unit/                # Unit tests
    ├── integration/         # Integration tests
    └── e2e/                 # End-to-end tests
```

## 🛠️ Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Runtime** | Node.js | 24.x LTS |
| **Package Manager** | PNPM | 9.x |
| **API Framework** | Fastify | 5.x |
| **Frontend** | React | 19.x |
| **Database** | PostgreSQL + PostGIS | 18.x |
| **Cache/Queue** | Redis + BullMQ | 8.x |
| **Reverse Proxy** | Traefik | 3.x |
| **Observability** | Grafana + Prometheus + Loki + Tempo (OTEL) | centralizat pe orchestrator |
| **Containerization** | Docker + Compose | 28.x |

## 📚 Documentation

- [Architecture Overview](docs/architecture/architecture.md)
- [ADR Index](docs/adr/ADR-INDEX.md)
- [API Specification](docs/api/openapi.yaml)
- [Getting Started Guide](docs/developer-guide/getting-started.md)
- [Coding Standards](docs/developer-guide/coding-standards.md)

## 🔒 Security

- All secrets managed via **OpenBao** (centralized secrets management)
- Dynamic database credentials (auto-rotating)
- AppRole authentication per service
- Network segmentation (public/backend/data)
- TLS termination at Traefik
- See [Security Policy](docs/governance/security-policy.md)
- See [OpenBao Setup Guide](docs/infrastructure/openbao-setup-guide.md)

## 📄 License

Private — All rights reserved.

---

**Cerniq.app** © 2026

