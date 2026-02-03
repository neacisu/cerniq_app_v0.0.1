# 🚨 Resource Upgrade Plan - Cerniq.app Infrastructure

> **Status**: ⚠️ PENDING - Current infrastructure does NOT meet ADR-0004 specifications
> **Created**: 2026-02-03
> **Priority**: HIGH - Required before production launch

---

## Executive Summary

Cerniq.app's architecture (ADR-0004, ADR-0027) was designed for a **128GB RAM, 20+ cores** production server. Current infrastructure falls significantly short of these requirements.

---

## Current vs Target Infrastructure

### Staging Server (Local/Development)

| Resource | Current | Status |
|----------|---------|--------|
| **RAM** | 125 GB | ✅ Adequate |
| **CPU** | 64 cores (AMD EPYC 7502P) | ✅ Exceeds target |
| **Disk** | 652 GB NVMe free | ✅ Adequate |
| **Note** | Shared with Neanelu, GeniusERP | ⚠️ Resource contention |

**Current Allocation for Cerniq (Staging)**:
- PostgreSQL: 16 GB limit, 8 GB reservation
- Redis: 4 GB limit, 2 GB reservation
- API/Workers: 6 GB combined
- **Total**: ~26 GB allocated

### Production Server (95.216.225.145)

| Resource | Current | Target (ADR-0004) | Gap |
|----------|---------|-------------------|-----|
| **RAM** | 10 GB | 128 GB | ❌ **-118 GB (92% deficit)** |
| **CPU** | 4 cores | 20 cores | ❌ **-16 cores (80% deficit)** |
| **Disk** | 15 GB free | 500+ GB | ❌ **-485 GB (97% deficit)** |

**Current Allocation for Cerniq (Production Minimal)**:
- PostgreSQL: 4 GB limit, 2 GB reservation
- Redis: 2 GB limit, 1 GB reservation
- API/Workers: 2 GB combined
- **Total**: ~8 GB (leaving 2 GB for OS/other)

---

## Impact of Resource Constraints

### Performance Limitations (Production Minimal)

| Feature | ADR-0004 Design | Current Capability | Impact |
|---------|-----------------|-------------------|--------|
| **Concurrent connections** | 200 | 50 | 75% reduction |
| **pgvector embeddings** | 10M+ vectors | ~500K vectors | Limited AI search |
| **Real-time enrichment** | 100 req/s | ~20 req/s | 5x slower |
| **Parallel workers** | 16 | 4 | Slower queries |
| **WAL archive** | 8 GB | 1 GB | Shorter PITR window |

### Features at Risk

1. **AI-Powered Prospecting** - Vector similarity search requires significant RAM
2. **Multi-tenant Scale** - Limited to ~50 concurrent users
3. **Real-time Dashboards** - May experience latency
4. **Batch Enrichment** - Will be throttled significantly

---

## Upgrade Recommendations

### Option A: Dedicated Production Server (Recommended)

**Hetzner AX102 or equivalent**:
- 128 GB ECC RAM
- AMD EPYC 7443P (24 cores)
- 2x 1TB NVMe SSD (RAID 1)
- **Estimated Cost**: ~€150-200/month

**Timeline**: 
- Procurement: 1-2 days
- Migration: 1 day
- Testing: 2 days
- **Total**: ~1 week

### Option B: Cloud Upgrade (AWS/GCP)

**AWS RDS db.r6g.4xlarge + EC2**:
- 128 GB RAM (RDS)
- 16 vCPUs
- **Estimated Cost**: ~$1,500-2,000/month

### Option C: Incremental Upgrade (Budget)

**Phase 1** (Immediate): Upgrade current server RAM
- Add 32 GB RAM → 42 GB total
- **Cost**: ~€100 one-time

**Phase 2** (Month 2): New server
- Full 128 GB server
- Migrate PostgreSQL

---

## Current Configuration Files

### Staging (postgresql.conf)
```
shared_buffers = 4GB
effective_cache_size = 12GB
max_connections = 100
io_method = io_uring
```

### Production Minimal (postgresql.production.conf)
```
shared_buffers = 1GB
effective_cache_size = 3GB
max_connections = 50
io_method = worker  # io_uring disabled
```

---

## Action Items

- [ ] **URGENT**: Review budget for production server upgrade
- [ ] **Week 1**: Procure Hetzner AX102 or equivalent
- [ ] **Week 2**: Set up new production server with full ADR-0004 specs
- [ ] **Week 3**: Migrate and test
- [ ] **Week 4**: Cutover to new production

---

## References

- [ADR-0004: PostgreSQL 18.1 with PostGIS](../adr/ADR%20Etapa%200/ADR-0004-PostgreSQL-18-1-cu-PostGIS.md)
- [ADR-0027: Container Resource Limits](../adr/ADR%20Etapa%200/ADR-0027-Container-Resource-Limits.md)
- [Docker Compose Reference](./docker-compose-reference.md)

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-02-03 | Initial document - identified resource gap | System |
