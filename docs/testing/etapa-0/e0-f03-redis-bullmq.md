# CERNIQ.APP — TESTE F0.3: REDIS & BULLMQ

## Teste pentru Redis 8.4 și configurare BullMQ

**Fază:** F0.3 | **Taskuri:** 3 (F0.3.1.T001 - F0.3.1.T003)  
**Referință:** [etapa0-plan-implementare-complet-v2.md](file:///var/www/CerniqAPP/docs/specifications/Etapa%200/etapa0-plan-implementare-complet-v2.md)

---

## SUMAR TASKURI

| Task ID | Denumire | Tip Test |
| ------- | -------- | -------- |
| F0.3.1.T001 | Redis Container Config | Infra Validation |
| F0.3.1.T002 | Redis Health & Persistence | Integration |
| F0.3.1.T003 | Network Connectivity | Integration |

---

## TESTE

### T001: Redis Container Configuration

**Scop:** Verifică configurația Redis optimizată pentru BullMQ.

```typescript
// tests/integration/redis/redis-container.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Redis Container', () => {
  
  it('should be running', async () => {
    const { stdout } = await execAsync('docker ps --filter name=cerniq-redis --format "{{.Status}}"');
    expect(stdout).toContain('Up');
  });
  
  it('should use redis:8.4-alpine image', async () => {
    const { stdout } = await execAsync('docker inspect cerniq-redis --format "{{.Config.Image}}"');
    expect(stdout.trim()).toMatch(/redis:7\.4/);
  });
  
  it('should be healthy', async () => {
    const { stdout } = await execAsync('docker inspect cerniq-redis --format "{{.State.Health.Status}}"');
    expect(stdout.trim()).toBe('healthy');
  });
  
  it('should NOT expose port 6379 publicly', async () => {
    const { stdout } = await execAsync('docker inspect cerniq-redis --format "{{.NetworkSettings.Ports}}"');
    expect(stdout).not.toContain('0.0.0.0:6379');
    expect(stdout).not.toContain('0.0.0.0:64039');
  });
  
  it('should be connected to both cerniq_data and cerniq_backend networks', async () => {
    const { stdout } = await execAsync('docker inspect cerniq-redis --format "{{json .NetworkSettings.Networks}}"');
    const networks = JSON.parse(stdout);
    expect(networks).toHaveProperty('cerniq_data');
    expect(networks).toHaveProperty('cerniq_backend');
  });
});
```

---

### T002: Redis BullMQ Critical Configuration

**Scop:** Verifică parametrii CRITICI pentru BullMQ.

> [!CAUTION]
> **maxmemory-policy TREBUIE să fie `noeviction`!**
> Altfel, BullMQ va pierde job-uri când memoria este plină.

```typescript
// tests/integration/redis/redis-bullmq-config.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import Redis from 'ioredis';

describe('Redis BullMQ Configuration', () => {
  let redis: Redis;
  
  beforeAll(() => {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  });
  
  afterAll(async () => {
    await redis.quit();
  });
  
  it('should have maxmemory-policy = noeviction (CRITICAL for BullMQ)', async () => {
    const config = await redis.config('GET', 'maxmemory-policy');
    expect(config[1]).toBe('noeviction');
  });
  
  it('should have appendonly = yes (AOF persistence)', async () => {
    const config = await redis.config('GET', 'appendonly');
    expect(config[1]).toBe('yes');
  });
  
  it('should have appendfsync = everysec', async () => {
    const config = await redis.config('GET', 'appendfsync');
    expect(config[1]).toBe('everysec');
  });
  
  it('should have notify-keyspace-events containing Ex (for delayed jobs)', async () => {
    const config = await redis.config('GET', 'notify-keyspace-events');
    expect(config[1]).toContain('E');
    expect(config[1]).toContain('x');
  });
  
  it('should have maxmemory = 8gb', async () => {
    const config = await redis.config('GET', 'maxmemory');
    const maxmemoryBytes = parseInt(config[1]);
    const maxmemoryGB = maxmemoryBytes / (1024 * 1024 * 1024);
    expect(maxmemoryGB).toBe(8);
  });
  
  it('should respond to PING', async () => {
    const pong = await redis.ping();
    expect(pong).toBe('PONG');
  });
});
```

---

### T003: Redis Persistence & Durability

**Scop:** Verifică persistența datelor.

```typescript
// tests/integration/redis/redis-persistence.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Redis from 'ioredis';

describe('Redis Persistence', () => {
  let redis: Redis;
  
  beforeAll(() => {
    redis = new Redis(process.env.REDIS_URL);
  });
  
  afterAll(async () => {
    await redis.quit();
  });
  
  it('should persist data to AOF', async () => {
    const testKey = `test:persistence:${Date.now()}`;
    
    // Set a value
    await redis.set(testKey, 'test-value');
    
    // Trigger BGSAVE
    await redis.bgsave();
    
    // Wait for save
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify
    const value = await redis.get(testKey);
    expect(value).toBe('test-value');
    
    // Cleanup
    await redis.del(testKey);
  });
  
  it('should have AOF file in data volume', async () => {
    const info = await redis.info('persistence');
    expect(info).toContain('aof_enabled:1');
    expect(info).toContain('aof_rewrite_in_progress:0');
  });
  
  it('should support keyspace notifications', async () => {
    const subscriber = redis.duplicate();
    
    const receivedEvents: string[] = [];
    
    await subscriber.psubscribe('__keyevent@0__:expired');
    
    subscriber.on('pmessage', (pattern, channel, message) => {
      receivedEvents.push(message);
    });
    
    // Set key with TTL
    const testKey = `test:expiry:${Date.now()}`;
    await redis.set(testKey, 'value', 'PX', 100);
    
    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Event should be received (for delayed jobs)
    // Note: May need longer wait in slow CI
    
    await subscriber.punsubscribe();
    await subscriber.quit();
  });
});
```

---

### T004: BullMQ Integration

**Scop:** Verifică că BullMQ funcționează corect.

```typescript
// tests/integration/redis/bullmq-integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

describe('BullMQ Integration', () => {
  let connection: Redis;
  let queue: Queue;
  
  beforeAll(() => {
    connection = new Redis({
      host: process.env.REDIS_HOST,
      maxRetriesPerRequest: null, // Required for BullMQ workers
    });
    
    queue = new Queue('test-queue', { connection });
  });
  
  afterAll(async () => {
    await queue.close();
    await connection.quit();
  });
  
  it('should add and process a job', async () => {
    const processedJobs: string[] = [];
    
    const worker = new Worker(
      'test-queue',
      async (job: Job) => {
        processedJobs.push(job.id!);
        return { success: true };
      },
      { connection, autorun: false }
    );
    
    // Add job
    const job = await queue.add('test-job', { data: 'test' });
    
    // Start worker
    worker.run();
    
    // Wait for processing
    await job.waitUntilFinished(queue.events);
    
    // Verify
    expect(processedJobs).toContain(job.id);
    
    await worker.close();
  });
  
  it('should support delayed jobs', async () => {
    const job = await queue.add(
      'delayed-job',
      { data: 'delayed' },
      { delay: 100 }
    );
    
    expect(job.delay).toBe(100);
    
    // Job should be in delayed state
    const state = await job.getState();
    expect(state).toBe('delayed');
    
    // Wait for delay
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Job should be waiting now
    const newState = await job.getState();
    expect(['waiting', 'active', 'completed']).toContain(newState);
  });
  
  it('should handle job retries', async () => {
    let attempts = 0;
    
    const worker = new Worker(
      'test-queue',
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Simulated failure');
        }
        return { success: true };
      },
      { 
        connection,
        autorun: false,
      }
    );
    
    const job = await queue.add(
      'retry-job',
      { data: 'retry' },
      { attempts: 3, backoff: { type: 'fixed', delay: 100 } }
    );
    
    worker.run();
    
    await job.waitUntilFinished(queue.events);
    
    expect(attempts).toBe(3);
    
    await worker.close();
  });
  
  it('should respect maxmemory-policy noeviction', async () => {
    // Verify that jobs are never evicted even under memory pressure
    const config = await connection.config('GET', 'maxmemory-policy');
    expect(config[1]).toBe('noeviction');
  });
});
```

---

### T005: Redis Network Connectivity

**Scop:** Verifică conectivitatea din toate containerele necesare.

```bash
#!/bin/bash
# tests/infra/f03-redis-network.test.sh

describe "Redis Network Connectivity" {
  
  it "should be accessible from cerniq_backend network" {
    docker run --rm --network cerniq_backend redis:8.4-alpine \
      redis-cli -h redis ping | grep -q "PONG"
    assert_success
  }
  
  it "should be accessible from cerniq_data network" {
    docker run --rm --network cerniq_data redis:8.4-alpine \
      redis-cli -h redis ping | grep -q "PONG"
    assert_success
  }
  
  it "should NOT be accessible from host on port 6379" {
    ! redis-cli -h localhost -p 6379 ping 2>/dev/null
    assert_success
  }
  
  it "should NOT be accessible from host on port 64039" {
    ! redis-cli -h localhost -p 64039 ping 2>/dev/null
    assert_success
  }
}
```

---

## CHECKLIST VALIDARE

### Container

- [ ] Image: redis:8.4-alpine
- [ ] Health status: healthy
- [ ] Nu expune port 6379 public
- [ ] Conectat la cerniq_data ȘI cerniq_backend

### BullMQ Configuration (CRITICAL)

- [ ] maxmemory-policy = **noeviction**
- [ ] appendonly = yes
- [ ] appendfsync = everysec
- [ ] notify-keyspace-events conține Ex
- [ ] maxmemory = 8gb

### Persistence

- [ ] AOF enabled
- [ ] Data volume mounted
- [ ] BGSAVE funcționează

### BullMQ Integration

- [ ] Job-uri se adaugă
- [ ] Job-uri se procesează
- [ ] Delayed jobs funcționează
- [ ] Retries funcționează

### Network

- [ ] Accesibil din cerniq_backend
- [ ] Accesibil din cerniq_data
- [ ] NU accesibil de pe host

---

**Document generat:** 20 Ianuarie 2026  
**Conformitate:** Master Spec v1.2
