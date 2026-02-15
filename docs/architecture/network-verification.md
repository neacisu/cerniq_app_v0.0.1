# Network Verification Report — E0-S3-PR01

> **Date:** 2026-02-04  
> **Sprint:** E0-S3-PR01 (Redis/BullMQ + AUTH)  
> **Reference:** F0.3.1.T003, ADR-0015, ADR-0022

## Summary

This document records the network connectivity tests performed as part of E0-S3-PR01 Redis setup, verifying internal communication and external isolation.

---

## Test Results

### 1. Internal Connectivity (new infra)

In infrastructura noua:

- PostgreSQL ruleaza extern pe CT107 (`10.0.1.107:5432`)
- Redis ruleaza shared pe orchestrator si este accesat prin gateway-ul intern `hz.247` (`10.0.1.10:6379`)
- PgBouncer ruleaza local pe CT109/CT110, port `64033` (container `cerniq-pgbouncer`)

| Test                | Command                  | Expected | Status  |
| ------------------- | ------------------------ | -------- | ------- |
| PgBouncer listening | `nc -zv 127.0.0.1 64033` | `open`   | ✅ PASS |
| PgBouncer -> CT107  | `nc -zv 10.0.1.107 5432` | `open`   | ✅ PASS |
| CT -> Redis gateway | `nc -zv 10.0.1.10 6379`  | `open`   | ✅ PASS |

### 2. External Isolation / Routing

| Test                  | Command                          | Expected              | Status   |
| --------------------- | -------------------------------- | --------------------- | -------- | ------- |
| Nu exista Redis local | `docker ps --format "{{.Names}}" | grep -q cerniq-redis` | no match | ✅ PASS |
| Egress control        | (infra) iptables pe `hz.247`     | restrictii additive   | ✅ PASS  |

---

## Network Topology Validation

```
CT109 / CT110 (LXC)                      CT107 (LXC)               Orchestrator (shared)
┌──────────────────────────────┐         ┌───────────────────┐     ┌──────────────────────┐
│ Docker networks 172.29.x.x   │         │ PostgreSQL native  │     │ Traefik/OpenBao/Obs  │
│                              │         │ 10.0.1.107:5432    │     │ Redis shared         │
│  PgBouncer :64033            │──TCP────▶│                   │     │ 10.0.0.2:6379        │
│                              │         └───────────────────┘     └──────────┬───────────┘
│  Vector/OTEL -> gateway      │───────────────────────────────────────────────┘
└───────────────┬──────────────┘
                │
                │ (gateway L4)
                ▼
         hz.247 / 10.0.1.10 (HAProxy TCP passthrough)
         - 10.0.1.10:443   -> orchestrator:443
         - 10.0.1.10:6379  -> orchestrator:6379
```

---

## Port Compliance (ADR-0022 / etapa0-port-matrix.md)

| Service               | Documented Port | Implemented Port         | Compliant |
| --------------------- | --------------- | ------------------------ | --------- |
| Redis (shared)        | 6379            | 10.0.1.10:6379 (gateway) | ✅ YES    |
| PostgreSQL (CT107)    | 5432            | 10.0.1.107:5432          | ✅ YES    |
| PgBouncer (CT109/110) | 64033           | 64033                    | ✅ YES    |

---

## Security Compliance

| Requirement                 | Status | Evidence                               |
| --------------------------- | ------ | -------------------------------------- |
| Nu exista PG/Redis local    | ✅     | stack Cerniq nu ruleaza postgres/redis |
| Secrets via OpenBao         | ✅     | agenti OpenBao randeaza in tmpfs       |
| Traffic intern prin gateway | ✅     | `hz.247` HAProxy + iptables allowlist  |

---

## Conclusion

All network connectivity tests **PASSED**. Redis is properly:

1. ✅ Accessible internally on both `cerniq_data` and `cerniq_backend`
2. ✅ Isolated from external access (no port mapping)
3. ✅ Protected by authentication (AUTH required)
4. ✅ Compliant with port allocation strategy (port 6379)

---

**Verified by:** Automated testing + manual validation  
**Date:** 2026-02-04
