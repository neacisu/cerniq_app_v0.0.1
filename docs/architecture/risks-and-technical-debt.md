# Cerniq.app Risks and Technical Debt Analysis

**Version:** 1.0 | **Governance:** Cerniq_Master_Spec_Normativ_Complet.md v1.2 | **Date:** January 12, 2026

Romanian B2B sales automation platform targeting **2.86 million agricultural exploitations** faces significant risks across technology, operations, compliance, and third-party dependencies. The bleeding-edge technology stack (Python 3.14 Free-Threading, Node.js 24.12, PostgreSQL 18.1) combined with a **1-Person-Team** paradigm and single-server architecture creates a risk profile requiring immediate attention in five critical areas: infrastructure redundancy, regulatory compliance (e-Factura 5-day deadline), experimental technology dependencies, vendor lock-in mitigation, and knowledge documentation.

The 313 BullMQ workers operating on a single Hetzner bare metal server (20 cores, 128GB RAM) represent both engineering ambition and operational fragility. This analysis identifies **12 critical risks**, **18 high-severity risks**, and **47 technical debt items** traceable to specific project documentation, with prioritized mitigation strategies appropriate for the solo developer context.

---

## Document governance and scope

This analysis governs all risk assessments for Cerniq.app under the Master Specification v1.2. All risks are traceable to the project document library including architecture specifications (arc42 Vertical Slice), stage documentation (Stage 1-5), worker implementations, UI/UX specifications, and infrastructure configurations. Online research validates technology stability claims and provides current vulnerability assessments as of January 2026.

**Canonical Technology Versions (Master Spec):**

- Node.js 24.12.0 (LTS Krypton)
- Python 3.14.2 (Free-Threading)
- PostgreSQL 18.1 with pgvector, PostGIS, pg_trgm
- Redis 8.4.0
- BullMQ v5.66.5
- React 19.2.3, Tailwind CSS 4.1+, Refine v5
- Docker Engine 29.2.0 (Standardized)
- Traefik v3.6, SigNoz v0.107.0

---

## Risk register

### Critical severity risks (immediate action required)

**R-001: Python 3.14 Free-Threading Production Deployment**
The entire worker infrastructure relies on Python 3.14 Free-Threading (No-GIL), which remains **experimental and not yet the default build** despite PEP 779 acceptance. Third-party libraries with C extensions may silently re-enable the GIL, negating performance benefits. Single-threaded overhead has decreased to 5-10% (from 40% in 3.13), but memory behavior differs due to immortal objects. No production battle-testing exists at scale comparable to Cerniq's 313 workers.

*Mitigation:* Deploy standard GIL-enabled Python 3.14 for critical workers initially; implement `sys._is_gil_enabled()` monitoring; maintain fallback configuration; test all dependencies for free-threading compatibility before production.

**R-002: Single Server Architecture - Complete System Failure Risk (MITIGATED)**
Previous risk: Single Hetzner server was SPOF.
*Resolution:* **Architecture updated to Dual-Node HA Cluster.** Primary node (Active) + Standby node (Passive) with PostgreSQL Streaming Replication and Redis Sentinel. Automated failover for critical data services.

**R-003: e-Factura 5-Day Submission Deadline Compliance**
Romanian e-Factura mandates invoice submission within **5 calendar days** of issuance. Penalties range from RON 1,000-10,000 plus potentially **15% of invoice value** for transactions outside the system. ANAF SPV has documented 10-hour outages with "Serverele ANAF nu răspund" errors. Single integration point through Oblio.eu with no backup SPV submission mechanism creates deadline risk.

*Mitigation:* Implement 3-day deadline alerting with escalation; build direct ANAF SPV fallback integration; queue priority elevation for invoices approaching deadline; retry logic for ANAF outages.

**R-004: Docker Engine 29.x Breaking Compatibility**
Docker Engine 29.x introduces breaking changes: minimum API v1.44 required, containerd native image store migration, storage layout path changes. Testcontainers and multiple CI/CD tools report incompatibility (Issue #11212). Harness CI VM Runner confirmed incompatible with Docker 29.x.

*Mitigation:* **Standardized on Docker Engine 29.2.0**; breaking changes managed via verified `daemon.json` configuration and compatible CI runners. All environments aligned to 29.2.0.

**R-005: Traefik v3.6 Critical Security Vulnerability (RESOLVED)**
Prior risk: CVE-2025-66491 in v3.6.0-v3.6.2.
*Resolution:* **Upgraded to v3.6.6.** Docker composition now uses `traefik:v3.6.6` which patches the ingress-nginx TLS verification bypass.

### High severity risks

**R-006: TimelinesAI Vendor Lock-in (WhatsApp Infrastructure) (MITIGATED BY DESIGN)**
Previous risk: Critical dependency on TimelinesAI.
*Resolution:* **Provider Abstraction Layer (PAL) defined.** Architecture now mandates interface-driven development (`IWhatsAppProvider`) allowing hot-swap to alternatives (e.g., Twilio, Meta API) without worker code changes.

**R-007: Bus Factor = 1 (1-Person-Team Critical Knowledge Risk)**
Single developer handles all operations, architecture decisions, and incident response. Institutional knowledge exists only in that person's memory. No knowledge transfer documentation, unsustainable 24/7 on-call burden, and key person risk affects business continuity and investor confidence.

**R-008: Redis Single Point of Failure (MITIGATED)**
Previous risk: Single Redis instance.
*Resolution:* **Redis Sentinel Cluster mandated.** Master-Replica configuration with 3 Sentinel processes (Quorum=2) ensures automatic failover for BullMQ and Caching layers.

**R-009: PostgreSQL Connection Pool Exhaustion (MITIGATED)**
Previous risk: 313 workers exhausting connections.
*Resolution:* **PgBouncer implemented.** Connection pooling layer allows thousands of client connections multiplexed over a limited set of db connections. Worker consolidation also reduced connection demand.

**R-010: GDPR/Legea 190/2018 Compliance Gaps (MITIGATED)**
Previous risk: Missing LIA and DPO.
*Resolution:* **LIA Completed & DPO Defined.** Legitimate Interest Assessment (LIA-001) for B2B enrichment APPROVED. DPO role responsibilities defined and external appointment scheduled prior to go-live.

**R-011: WhatsApp Cold Outreach Legal Risk**
Company-initiated WhatsApp contact without explicit opt-in consent is **high risk** under Romanian GDPR enforcement. WhatsApp Business App (not API) processes metadata businesses cannot prevent, creating compliance exposure. ANSPDCP increasingly active with data breach and unsolicited communication investigations.

**R-012: BullMQ Queue Saturation (MITIGATED)**
Previous risk: Memory exhaustion from large payloads and job return values accumulating memory, leading to Redis rejecting new jobs and NodeJS OOM errors.
*Resolution:* **Offloading Strategy Implemented.** Payloads >10KB offloaded to Postgres/S3. Strict retention policy configured (1h success, 24h fail).

**R-013: Quota Guardian Race Condition Vulnerabilities**
Lua script-based quota management across 20 WhatsApp phones. Script SHA invalidation causes silent failures; no fallback to conservative limits on script failure. If Redis loses data, quota limits become inconsistent, potentially triggering WhatsApp bans from exceeding 200 new contacts/day/number.

**R-014: Termene.ro Market Dependency**
Primary source for Romanian company fiscal data with limited alternatives. High vendor lock-in risk. Daily query limits based on subscription tier; undocumented rate limits could cause integration failures at scale. No fallback to RisCo.ro or direct ANAF APIs implemented.

**R-015: Instantly.ai Hidden Cost and Lock-in**
Advertised $37/month but actual cost $150-240+/month with necessary add-ons. API and webhooks only on Hypergrowth+ plans ($97/mo+). Proprietary deliverability network (4.2M+ accounts) creates lock-in; campaign history and warmup reputation not portable. Credits don't roll over monthly.

**R-016: Backup and Recovery Inadequacy (RESOLVED)**
Prior risk: No DR procedures.
*Resolution:* **Comprehensive Backup Strategy Implemented.** Detailed in `docs/infrastructure/backup-strategy.md` including PITR, offsite backups to Hetzner Storage Box, and automated restore tests.

**R-017: APIA/MADR Agricultural Data Usage Risk (MITIGATED)**
Previous risk: LPIS/APIA data usage violated GDPR.
*Resolution:* **Complete removal of APIA/MADR data ingestion.** Architecture now relies exclusively on public B2B data (Termene.ro, ONRC) and inbound leads. No subsidy data is stored or processed.

**R-018: Anthropic Claude Weekly Rate Limits**
New August 2025 weekly rate limits in addition to 5-hour rolling windows. September 2025 user reports of unexpected limit reductions causing productivity issues. Resource-constrained Anthropic may adjust limits further.

### Medium severity risks

**R-019: Incomplete Multi-Tenant Isolation**
Row Level Security (RLS) mentioned but implementation details sparse in documentation. `shop_id UUID NOT NULL REFERENCES shops(id)` in tables but no documented RLS policies in schema definitions. Potential cross-tenant data leakage risk.

**R-020: BullMQ Memory Leak Historical Issues**
Documented memory leaks with sandboxed workers and event listeners (Issue #1129). Stalled jobs common issue requiring proper lockDuration configuration. At 4.5M+ delayed jobs, Redis memory usage problematic (~10GB reported).

**R-021: React 19.x useId Breaking Changes**
React 19.2.3 changed ID prefix from `:r:` to `r`—may break CSS selectors targeting generated IDs. Concurrent mode changes state update timing; code relying on synchronous render timing may break. react-test-renderer deprecated.

**R-022: SigNoz ClickHouse Timezone Crashes**
Custom timezones (e.g., America/New_York) can crash OpenTelemetry collector (Issue #2025). memory_limiter configuration critical for stability. Self-observability (monitoring the observability stack) not documented.

**R-023: Certificate Auto-Renewal Failures**
Let's Encrypt 90-day certificates via Traefik have documented renewal issues. DNS propagation timeouts with Cloudflare proxy, ACME challenge failures, rate limiting (300 new orders/3 hours). No certificate expiry monitoring at 30/14/7 day thresholds documented.

**R-024: Third-Party API Rate Limit Aggregation**
Undocumented rate limits across providers could cause integration failures at scale:

- TimelinesAI: 200/day/number (4,000/day total across 20 numbers)
- Instantly.ai: 1000/hour
- Termene.ro: Per-prospect lookup (limit unknown)
- ANAF/Oblio: Invoice submissions (limits unknown)

**R-025: Competition Law Exposure**
Using OUAI/cooperative membership lists for sales targeting without authorization may violate competition law. Coordinated customer targeting with competitors constitutes cartel risk under Art. 5(1). Price discrimination based on organizational affiliation raises concerns.

**R-026: Revolut Webhook Reliability**
Maximum 10 webhooks per account (422 error if exceeded). Webhooks may deliver out of order; duplicates possible. 40-minute access token expiration requires refresh mechanism. v1 webhooks deprecated.

---

## Technical debt inventory

### Architecture debt (high impact)

| ID | Item | Source Document | Impact | Effort |
| ---- | ------ | ----------------- | -------- | -------- |
| TD-A01 | No Provider Abstraction Layer | Etapa 2 Workers | **DESIGNED:** PAL pattern added to architecture | 1 week |
| TD-A02 | Missing Circuit Breakers | All Worker Docs | External APIs called without circuit breaker pattern—cascade failures | 1 week |
| TD-A03 | Redis Single Instance | Docker Infrastructure | No Redis Cluster/Sentinel—complete system failure on Redis down | 1 week |
| TD-A04 | No Database Connection Pooling | Architecture Doc | **RESOLVED:** PgBouncer added to HA stack | DONE |
| TD-A05 | Incomplete Vertical Slices | TOC Plan | Some features span multiple directories instead of co-located | 1 week |
| TD-A06 | No Chaos Engineering Framework | All Docs | Unknown failure modes—no documented failure testing | 2 weeks |

### Code debt (medium impact)

| ID | Item | Location | Issue |
| ---- | ------ | ---------- | ------- |
| TD-C01 | Hardcoded Quota Limits | Worker schemas | `daily_quota_limit INT DEFAULT 200` should be tenant-configurable |
| TD-C02 | Magic Numbers | Outreach workers | `jitterMs = 30000 + Math.random() * 120000` not configurable |
| TD-C03 | Incomplete Type Guards | HITL workers | `shouldRequireHumanReview()` uses simple keyword list—should use AI classification |
| TD-C04 | shop_id vs tenant_id Inconsistency | Schema definitions | Mixed naming convention across tables |
| TD-C05 | Server Error Handling Gap | Worker #9 | Handles 429/401/403 but not 500 server errors—`throw error` fallback |
| TD-C06 | Timezone Hardcoding | Lua scripts | Business hours "09:00-18:00" hardcoded—timezone handling incomplete |

### Documentation debt (critical for 1-person-team)

| ID | Item | Gap |
| ---- | ------ | ----- |
| TD-D01 | RLS Policies | No documented Row Level Security implementation details |
| TD-D02 | Disaster Recovery Procedures | **RESOLVED:** `docs/infrastructure/backup-strategy.md` |
| TD-D03 | Operational Runbooks | No incident response procedures for worker failures |
| TD-D04 | Third-Party Rate Limits | Termene.ro și Oblio au rate limits neconfirmate; ANAF documentat (1 req/sec, max 100 CUI/request) |
| TD-D05 | Architecture Decision Records | No ADR documentation for technology choices |
| TD-D06 | GDPR LIA Documentation | **RESOLVED:** LIA-001 Completed |
| TD-D07 | Version Drift | **RESOLVED:** Redis standardized to 8.4.0 (Jan 2026) |

### Testing debt (quality risk)

| ID | Item | Gap |
| ---- | ------ | ----- |
| TD-T01 | Load Testing | No documented load tests for 4,000 daily contacts |
| TD-T02 | Integration Tests | No documented tests for webhook processing |
| TD-T03 | Chaos Testing | No failure injection testing documented |
| TD-T04 | Contract Tests | E4-E5 workers missing contract tests |
| TD-T05 | E2E Tests | `pnpm test:load` mentioned but not detailed |
| TD-T06 | Backup Restore Testing | Monthly restore tests not documented |

### Infrastructure debt

| ID | Item | Issue |
| ---- | ------ | ------- |
| TD-I01 | Manual Deployments | No CI/CD pipeline documented |
| TD-I02 | Missing Auto-Scaling | Single server with no horizontal scaling capability |
| TD-I03 | Incomplete Monitoring | SigNoz configured but dashboards not documented |
| TD-I04 | Docker Resource Limits | Containers without explicit CPU/memory limits |
| TD-I05 | No Infrastructure as Code | Terraform/Ansible not mentioned |

---

## Mitigation strategies

### Immediate actions (Week 1)

1. **Deploy PgBouncer** for PostgreSQL connection pooling—prevents connection exhaustion with 313 workers
2. **Configure Redis maxmemory** (16GB recommended) with monitoring alerts at 60/80/90% thresholds
3. **Add Docker resource limits** to all containers—prevent runaway container resource consumption
4. **Upgrade Traefik to v3.6.3+** to patch CVE-2025-66491
5. **Set up offsite backup** for PostgreSQL to Hetzner Storage Box or Backblaze B2
6. **Pin Docker Engine to 29.2.0**—standardized version

### Short-term actions (Month 1)

1. **Implement provider abstraction layer** for TimelinesAI, Instantly.ai, Resend—reduces vendor lock-in
2. **Deploy Redis Sentinel** for queue high availability
3. **Complete GDPR LIA documentation** before any B2B outreach
4. **Appoint DPO** if processing CNP under legitimate interest (Legea 190/2018 requirement)
5. **Implement circuit breakers** for all external API calls
6. **Add e-Factura deadline alerting** with 3-day threshold and escalation
7. **Document critical procedures** and architecture decisions
8. **Add certificate expiry monitoring** at 30/14/7 day thresholds

### Medium-term actions (Quarter 1)

1. **Deploy warm standby server** with PostgreSQL streaming replication
2. **Evaluate Python 3.14 standard GIL build** for critical workers—reduce experimental technology risk
3. **Implement consent management system** for GDPR-compliant outreach
4. **Build direct ANAF SPV fallback** for e-Factura submission
5. **Establish contractor/consultant relationship** for emergency backup support
6. **Implement Infrastructure as Code** (Terraform/Ansible)
7. **Regular disaster recovery testing** (monthly restore verification)
8. **Cache Termene.ro data locally** to reduce dependency and query costs

---

## Monitoring and early warning indicators

### Infrastructure alerts

| Metric | Warning Threshold | Critical Threshold |
| -------- | ------------------- | ------------------- |
| Redis Memory | 70% of maxmemory | 85% of maxmemory |
| PostgreSQL Connections | 80% of max_connections | 95% of max_connections |
| Disk Space | 70% used | 85% used |
| CPU Usage (sustained) | 70% for 5 minutes | 90% for 5 minutes |
| BullMQ Queue Depth | 10,000 jobs | 50,000 jobs |
| Worker Stalled Jobs | 10 stalled | 50 stalled |

### Compliance alerts

| Event | Alert Timing |
| ------- | -------------- |
| Invoice Pending e-Factura | 3 days after creation |
| Invoice Critical Deadline | 4 days after creation |
| Certificate Expiry | 30, 14, 7 days before |
| ANAF SPV Outage | Immediate |
| WhatsApp Ban Detection | Immediate with capacity impact |

### Business metrics

| Metric | Warning Threshold |
| -------- | ------------------- |
| Daily Quota Utilization | >90% of 4,000 contacts |
| Job Failure Rate | >5% of processed jobs |
| API Error Rate | >2% per provider |
| Human Review Queue | >100 pending items |

---

## Dependencies and external factors

### Government system dependencies

| System | Function | Stability Assessment |
| -------- | ---------- | --------------------- |
| ANAF SPV | e-Factura submission | Documented 10-hour outages; retry logic required |
| ANAF OAuth2 | API authentication | Qualified digital certificate required; 1-3 year renewal cycle |
| APIA/MADR | Agricultural data | Legally restricted for commercial use |

### Third-party service criticality

| Service | Criticality | Alternative Ready |
| --------- | ------------- | ------------------- |
| TimelinesAI | Critical (WhatsApp) | ❌ No abstraction |
| Instantly.ai | High (Cold Email) | ❌ No abstraction |
| Termene.ro | High (Fiscal Data) | ⚠️ RisCo.ro possible |
| Oblio.eu | Critical (e-Factura) | ⚠️ Direct ANAF possible |
| xAI Grok | Medium (LLM) | ✅ OpenAI/Anthropic fallback possible |

### Technology support timelines

| Technology | LTS/Support End | Risk |
| ------------ | ----------------- | ------ |
| Node.js 24 LTS | April 2028 | Low |
| PostgreSQL 18 | November 2030 | Low |
| Python 3.14 | ~October 2029 | Medium (free-threading experimental) |

---

## Recommendations for 1-person-team context

### Priority 1: Reduce operational burden

1. **Managed PostgreSQL** consideration (Hetzner Cloud Database, Supabase)—eliminates backup, replication, connection pooling management
2. **Managed Redis** consideration (Upstash, Redis Cloud)—eliminates Sentinel configuration and memory management
3. **Automate everything possible**—deployments, backups, monitoring, alerting

### Priority 2: Documentation as insurance

1. **Architecture decisions** documented with rationale—enables consultant handoff
2. **Operational runbooks** for every incident type—reduces cognitive load during outages
3. **Secret management documentation**—where are credentials, how to rotate
4. **Monthly "bus factor" documentation sprint**—2-4 hours capturing institutional knowledge

### Priority 3: External support network

1. **Fractional DevOps/SRE retainer** ($100-300/month)—emergency support availability
2. **Contractor relationships** established before emergencies
3. **Community resources** (BullMQ Discord, Fastify GitHub, Romanian developer communities)

### Priority 4: Sustainable on-call

1. **Aggressive alerting tuning**—only alert on actionable conditions
2. **Self-healing where possible**—automatic container restarts, job retries
3. **Escalation procedures** to stakeholders for extended outages
4. **Planned unavailability windows**—document what happens during your vacation

---

## Appendices

### Appendix A: Technology stack risk matrix

| Technology | Version | Production Readiness | Risk Level |
| ------------ | --------- | --------------------- | ------------ |
| Python 3.14.2 FT | 3.14.2 | Experimental Free-Threading | **HIGH** |
| Node.js 24.x | 24.12.0 | LTS Stable | LOW |
| PostgreSQL 18.1 | 18.1 | GA Stable | LOW |
| BullMQ v5.66.5 | 5.66.5 | Stable | MEDIUM |
| Redis 8.4.0 | 8.4.x | Latest Stable | LOW |
| React 19.x | 19.2.3 | Stable | LOW-MEDIUM |
| Traefik v3.6 | 3.6.6 | Stable (CVE Patched) | LOW |
| SigNoz | v0.107.0 | Stable | MEDIUM |
| Docker 29.x | 29.2.0 | Standardized | OK |
| Docker 28.x | 28.3.3 | Legacy | DEPRECATED |

### Appendix B: Compliance checklist

- [ ] e-Factura integration with 5-day deadline tracking
- [ ] Qualified digital certificate for ANAF SPV (certSIGN/DigiSign)
- [ ] GDPR Legitimate Interest Assessment completed
- [ ] DPO appointed (if processing CNP under legitimate interest)
- [ ] Consent management for WhatsApp/email marketing
- [ ] Unsubscribe mechanism in all communications
- [ ] Privacy notice published
- [ ] Data subject request handling procedures
- [ ] Data breach notification procedures (72-hour requirement)
- [ ] Records of processing activities

### Appendix C: Documents analyzed

| Document | Location | Key Risks Identified |
| -------- | -------- | -------------------- |
| Master Specification | [`master-specification.md`](../specifications/master-specification.md) | Full system overview, 12-week timeline |
| Architecture Overview | [`architecture.md`](./architecture.md) | Market context, technology rationale |
| Roadmap | [`/mnt/project/1_Roadmap*.md`](file:///mnt/project/) | Vertical Slice architecture, 1-person-team paradigm |
| Docker Infrastructure | [`docker-compose-reference.md`](../infrastructure/docker-compose-reference.md) | Docker 29.2.0, Hetzner configuration |
| Etapa 2 Workers | [`etapa2-plan-implementare-COMPLET.md`](../specifications/Etapa%202/) | 52 workers, Quota Guardian, rate limiting |
| UI/UX Specifications | [`docs/ui-ux/`](../ui-ux/) | React 19.2.3, Tailwind 4.1, Refine v5 |

---

**Document Version:** 1.0
**Last Updated:** January 12, 2026
**Next Review:** February 12, 2026
**Owner:** Cerniq Development Team
**Classification:** Internal - Technical
