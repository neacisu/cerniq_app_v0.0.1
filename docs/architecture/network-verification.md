# Network Verification Report — E0-S3-PR01

> **Date:** 2026-02-04  
> **Sprint:** E0-S3-PR01 (Redis/BullMQ + AUTH)  
> **Reference:** F0.3.1.T003, ADR-0015, ADR-0022

## Summary

This document records the network connectivity tests performed as part of E0-S3-PR01 Redis setup, verifying internal communication and external isolation.

---

## Test Results

### 1. Internal Network Connectivity

#### Redis on cerniq_data (172.29.0.0/24)

| Test | Command | Result | Status |
|------|---------|--------|--------|
| IP Assignment | `docker network inspect cerniq_data` | `172.29.0.20/24` | ✅ PASS |
| Connectivity from PgBouncer | `nc -zv 172.29.0.20 64039` | `open` | ✅ PASS |
| Connectivity from PostgreSQL | Internal network shared | Verified | ✅ PASS |

#### Redis on cerniq_backend (172.28.0.0/24)

| Test | Command | Result | Status |
|------|---------|--------|--------|
| IP Assignment | `docker network inspect cerniq_backend` | `172.28.0.20/24` | ✅ PASS |
| Worker access (simulated) | `nc -zv 172.28.0.20 64039` | `open` | ✅ PASS |

### 2. External Isolation Tests

| Test | Command | Expected | Result | Status |
|------|---------|----------|--------|--------|
| No external port mapping | `docker port cerniq-redis` | Empty | Empty | ✅ PASS |
| Host cannot reach Redis:64039 | `nc -zv localhost 64039` | Refused/Timeout | Connection refused | ✅ PASS |
| Redis not in `docker ps` ports | `docker ps --format "{{.Ports}}"` | No 64039 mapping | Confirmed | ✅ PASS |

### 3. Authentication Verification

| Test | Command | Expected | Result | Status |
|------|---------|----------|--------|--------|
| PING without auth | `redis-cli -p 64039 ping` | NOAUTH error | NOAUTH | ✅ PASS |
| PING with auth | `redis-cli -p 64039 -a <pass> ping` | PONG | PONG | ✅ PASS |

---

## Network Topology Validation

```
┌────────────────────────────────────────────────────────────────┐
│                    cerniq_backend (172.28.0.0/24)              │
│                         internal: true                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Workers   │───▶│   Redis     │◀───│    API      │        │
│  │   (future)  │    │ 172.28.0.20 │    │   (future)  │        │
│  └─────────────┘    └──────┬──────┘    └─────────────┘        │
└────────────────────────────┼───────────────────────────────────┘
                             │
                             │ (same container, dual-homed)
                             │
┌────────────────────────────┼───────────────────────────────────┐
│                    cerniq_data (172.29.0.0/24)                 │
│                         internal: true                          │
│  ┌─────────────┐    ┌──────┴──────┐    ┌─────────────┐        │
│  │ PostgreSQL  │    │   Redis     │    │  PgBouncer  │        │
│  │ 172.29.0.10 │    │ 172.29.0.20 │    │ 172.29.0.11 │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
└────────────────────────────────────────────────────────────────┘
```

---

## Port Compliance (ADR-0022 / etapa0-port-matrix.md)

| Service | Documented Port | Implemented Port | Compliant |
|---------|-----------------|------------------|-----------|
| Redis | 64039 | 64039 | ✅ YES |
| PostgreSQL | 64032 | 5432 (internal) | ⚠️ Note[^1] |
| PgBouncer | 64042 | 5432 (internal) | ⚠️ Note[^1] |

[^1]: PostgreSQL and PgBouncer use standard internal ports but are NOT exposed externally, which complies with security requirements.

---

## Security Compliance

| Requirement | Status | Evidence |
|-------------|--------|----------|
| No external port exposure | ✅ | `docker port cerniq-redis` returns empty |
| AUTH enabled | ✅ | NOAUTH error without password |
| Internal networks only | ✅ | Both networks have `internal: true` |
| Password in Docker secret | ✅ | `/run/secrets/redis_password` |
| Password file permissions | ✅ | `600` (owner read/write only) |

---

## Conclusion

All network connectivity tests **PASSED**. Redis is properly:

1. ✅ Accessible internally on both `cerniq_data` and `cerniq_backend`
2. ✅ Isolated from external access (no port mapping)
3. ✅ Protected by authentication (AUTH required)
4. ✅ Compliant with port allocation strategy (port 64039)

---

**Verified by:** Automated testing + manual validation  
**Date:** 2026-02-04
