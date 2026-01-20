# CERNIQ.APP — Redis High Availability

## Sentinel Configuration pentru BullMQ

**Versiune:** 1.0  
**Data:** 20 Ianuarie 2026  
**Status:** Planificat pentru Q1 2026

---

## 1. CONTEXT

### Problema

- Single Redis instance = Single Point of Failure
- 313 workeri depind de Redis pentru BullMQ queues
- Redis down = Toate job-urile blocate

### Soluția Recomandată

**Redis Sentinel** (nu Redis Cluster) pentru:

- Automatic failover
- Compatibilitate BullMQ nativă
- Simplitate operațională

---

## 2. ARCHITECTURĂ

### 2.1 Topology

```text
                    ┌─────────────────┐
                    │   Application   │
                    │   (BullMQ)      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Sentinel x3   │
                    │   (quorum=2)    │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
   ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
   │   Master    │    │   Replica   │    │   Replica   │
   │   Redis     │◄───│   Redis     │    │   Redis     │
   └─────────────┘    └─────────────┘    └─────────────┘
```

### 2.2 Componente

| Component | Rol | Count |
| --------- | --- | ----- |
| Redis Master | Write operations, primary | 1 |
| Redis Replica | Read operations, failover candidates | 2 |
| Sentinel | Monitoring, automatic failover | 3 |

---

## 3. CONFIGURARE

### 3.1 Docker Compose

```yaml
# docker-compose.redis-ha.yml
version: '3.8'

services:
  redis-master:
    image: redis:8.4-alpine
    command: redis-server --appendonly yes --maxmemory-policy noeviction
    volumes:
      - redis-master-data:/data
    networks:
      - cerniq-network

  redis-replica-1:
    image: redis:8.4-alpine
    command: redis-server --replicaof redis-master 6379 --appendonly yes
    depends_on:
      - redis-master
    volumes:
      - redis-replica-1-data:/data
    networks:
      - cerniq-network

  redis-replica-2:
    image: redis:8.4-alpine
    command: redis-server --replicaof redis-master 6379 --appendonly yes
    depends_on:
      - redis-master
    volumes:
      - redis-replica-2-data:/data
    networks:
      - cerniq-network

  sentinel-1:
    image: redis:8.4-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf
    depends_on:
      - redis-master
    networks:
      - cerniq-network

  sentinel-2:
    image: redis:8.4-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf
    depends_on:
      - redis-master
    networks:
      - cerniq-network

  sentinel-3:
    image: redis:8.4-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf
    depends_on:
      - redis-master
    networks:
      - cerniq-network

volumes:
  redis-master-data:
  redis-replica-1-data:
  redis-replica-2-data:

networks:
  cerniq-network:
    external: true
```

### 3.2 Sentinel Configuration

```conf
# sentinel.conf
sentinel monitor mymaster redis-master 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1

# Authentication (if enabled)
# sentinel auth-pass mymaster your-redis-password
```

### 3.3 BullMQ Connection

```typescript
// lib/redis/sentinel-connection.ts
import { Redis } from 'ioredis';

export function createSentinelConnection(): Redis {
  return new Redis({
    sentinels: [
      { host: 'sentinel-1', port: 26379 },
      { host: 'sentinel-2', port: 26379 },
      { host: 'sentinel-3', port: 26379 },
    ],
    name: 'mymaster',
    // password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

// Usage in BullMQ
import { Queue, Worker } from 'bullmq';

const connection = createSentinelConnection();

const queue = new Queue('my-queue', { connection });
const worker = new Worker('my-queue', processor, { connection });
```

---

## 4. FAILOVER PROCEDURE

### 4.1 Automatic Failover

Sentinel handles automatically:

1. Master detectat ca down (after `down-after-milliseconds`)
2. Quorum (2/3 sentinels) confirmă
3. Replica promovat la Master
4. Alte replici reconfigure către noul Master
5. Clienții reconectează automat

### 4.2 Manual Failover

```bash
# Force failover (for maintenance)
redis-cli -h sentinel-1 -p 26379 SENTINEL FAILOVER mymaster

# Check current master
redis-cli -h sentinel-1 -p 26379 SENTINEL GET-MASTER-ADDR-BY-NAME mymaster
```

### 4.3 Recovery After Failure

```bash
# Check replication status
redis-cli -h redis-master INFO replication

# Verify sentinels
redis-cli -h sentinel-1 -p 26379 SENTINEL MASTER mymaster
```

---

## 5. MONITORING

### 5.1 Health Checks

```bash
# Master health
redis-cli -h redis-master PING

# Sentinel health
redis-cli -h sentinel-1 -p 26379 PING

# Replication lag
redis-cli -h redis-master INFO replication | grep slave
```

### 5.2 SigNoz Metrics

```yaml
# Metrics to monitor
- redis_connected_slaves          # Should be 2
- redis_master_repl_offset        # Replication progress
- sentinel_known_slaves           # Should be 2
- sentinel_known_sentinels        # Should be 3
```

### 5.3 Alerts

```yaml
alerts:
  - name: RedisMasterDown
    condition: redis_up{role="master"} == 0
    duration: 1m
    severity: critical
    
  - name: RedisReplicationLag
    condition: redis_replication_lag_seconds > 10
    duration: 5m
    severity: warning
```

---

## 6. MIGRATION PLAN

### Phase 1: Setup (No Downtime)

1. Deploy Sentinel + Replicas alongside existing single Redis
2. Configure replication from existing to new master
3. Test failover în staging

### Phase 2: Switchover

1. Update connection strings to Sentinel
2. Rolling restart workers
3. Verify all connections through Sentinel

### Phase 3: Cleanup

1. Decommission old single Redis
2. Enable monitoring alerts
3. Document runbook

---

## 7. DOCUMENTE CONEXE

- [Backup Strategy](./backup-strategy.md)
- [Docker Compose Reference](./docker-compose-reference.md)
- [Technical Debt Board](../architecture/technical-debt-board.md) — TD-I02

---

**Actualizat:** 20 Ianuarie 2026
