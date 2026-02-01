# CERNIQ.APP — TESTE F0.2: POSTGRESQL 18.1 SETUP

## Teste pentru PostgreSQL, PostGIS, pgvector și configurare

**Fază:** F0.2 | **Taskuri:** 5 (F0.2.1.T001 - F0.2.1.T005)  
**Referință:** [etapa0-plan-implementare-complet-v2.md](file:///var/www/CerniqAPP/docs/specifications/Etapa%200/etapa0-plan-implementare-complet-v2.md)

---

## SUMAR TASKURI

| Task ID | Denumire | Tip Test |
| ------- | -------- | -------- |
| F0.2.1.T001 | PostgreSQL Container | Integration |
| F0.2.1.T002 | postgresql.conf Tuning | Infra Validation |
| F0.2.1.T003 | init.sql Extensions | Integration |
| F0.2.1.T004 | PostgreSQL Secret | Security |
| F0.2.1.T005 | Container Health | Integration |

---

## TESTE

### T001: PostgreSQL Container Configuration

**Scop:** Verifică serviciul PostgreSQL în Docker Compose.

```typescript
// tests/integration/database/postgresql-container.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('PostgreSQL Container', () => {
  
  it('should be running', async () => {
    const { stdout } = await execAsync('docker ps --filter name=cerniq-postgres --format "{{.Status}}"');
    expect(stdout).toContain('Up');
  });
  
  it('should use postgis/postgis:18-3.6 image', async () => {
    const { stdout } = await execAsync('docker inspect cerniq-postgres --format "{{.Config.Image}}"');
    expect(stdout.trim()).toBe('postgis/postgis:18-3.6');
  });
  
  it('should be healthy', async () => {
    const { stdout } = await execAsync('docker inspect cerniq-postgres --format "{{.State.Health.Status}}"');
    expect(stdout.trim()).toBe('healthy');
  });
  
  it('should NOT expose port 64032 publicly', async () => {
    const { stdout } = await execAsync('docker inspect cerniq-postgres --format "{{.NetworkSettings.Ports}}"');
    // Nu ar trebui să aibă mapping 0.0.0.0:64032
    expect(stdout).not.toContain('0.0.0.0:64032');
  });
  
  it('should be connected to cerniq_data network', async () => {
    const { stdout } = await execAsync('docker inspect cerniq-postgres --format "{{json .NetworkSettings.Networks}}"');
    const networks = JSON.parse(stdout);
    expect(networks).toHaveProperty('cerniq_data');
  });
  
  it('should have resource limits configured', async () => {
    const { stdout } = await execAsync('docker inspect cerniq-postgres --format "{{.HostConfig.Memory}}"');
    const memoryBytes = parseInt(stdout.trim());
    const memoryGB = memoryBytes / (1024 * 1024 * 1024);
    expect(memoryGB).toBeGreaterThanOrEqual(32);
  });
});
```

---

### T002: postgresql.conf Tuning

**Scop:** Verifică parametrii pentru 128GB RAM server.

```typescript
// tests/integration/database/postgresql-config.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '@cerniq/db';

describe('PostgreSQL Configuration (128GB Tuning)', () => {
  
  it('should have shared_buffers = 32GB', async () => {
    const result = await db.execute(sql`SHOW shared_buffers`);
    expect(result[0].shared_buffers).toBe('32GB');
  });
  
  it('should have effective_cache_size = 96GB', async () => {
    const result = await db.execute(sql`SHOW effective_cache_size`);
    expect(result[0].effective_cache_size).toBe('96GB');
  });
  
  it('should have work_mem = 256MB', async () => {
    const result = await db.execute(sql`SHOW work_mem`);
    expect(result[0].work_mem).toBe('256MB');
  });
  
  it('should have max_connections = 200', async () => {
    const result = await db.execute(sql`SHOW max_connections`);
    expect(parseInt(result[0].max_connections)).toBe(200);
  });
  
  it('should have io_method = io_uring (PostgreSQL 18 AIO)', async () => {
    const result = await db.execute(sql`SHOW io_method`);
    expect(result[0].io_method).toBe('io_uring');
  });
  
  it('should have max_parallel_workers_per_gather = 8', async () => {
    const result = await db.execute(sql`SHOW max_parallel_workers_per_gather`);
    expect(parseInt(result[0].max_parallel_workers_per_gather)).toBe(8);
  });
  
  it('should use scram-sha-256 password encryption', async () => {
    const result = await db.execute(sql`SHOW password_encryption`);
    expect(result[0].password_encryption).toBe('scram-sha-256');
  });
  
  it('should have logging configured', async () => {
    const result = await db.execute(sql`SHOW logging_collector`);
    expect(result[0].logging_collector).toBe('on');
  });
});
```

---

### T003: PostgreSQL Extensions

**Scop:** Verifică extensiile obligatorii.

```typescript
// tests/integration/database/postgresql-extensions.test.ts
import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '@cerniq/db';

describe('PostgreSQL Extensions', () => {
  
  const requiredExtensions = [
    'pgvector',
    'postgis',
    'postgis_topology',
    'pg_trgm',
    'uuid-ossp',
  ];
  
  it.each(requiredExtensions)('should have %s extension installed', async (extName) => {
    const result = await db.execute(
      sql`SELECT 1 FROM pg_extension WHERE extname = ${extName}`
    );
    expect(result.length).toBe(1);
  });
  
  it('should have pgvector with VECTOR type available', async () => {
    // Test that VECTOR type works
    await expect(
      db.execute(sql`SELECT '[1,2,3]'::vector(3)`)
    ).resolves.not.toThrow();
  });
  
  it('should have PostGIS with GEOGRAPHY type available', async () => {
    await expect(
      db.execute(sql`SELECT ST_MakePoint(26.1, 44.4)::geography`)
    ).resolves.not.toThrow();
  });
  
  it('should have pg_trgm for fuzzy search', async () => {
    const result = await db.execute(sql`SELECT similarity('test', 'tset')`);
    expect(parseFloat(result[0].similarity)).toBeGreaterThan(0.5);
  });
});
```

---

### T004: PostgreSQL Schemas

**Scop:** Verifică schema-urile create în init.sql.

```typescript
// tests/integration/database/postgresql-schemas.test.ts
import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '@cerniq/db';

describe('PostgreSQL Schemas', () => {
  
  const requiredSchemas = ['bronze', 'silver', 'gold', 'approval', 'audit'];
  
  it.each(requiredSchemas)('should have %s schema', async (schemaName) => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.schemata WHERE schema_name = ${schemaName}`
    );
    expect(result.length).toBe(1);
  });
  
  it('should have cerniq_app role with correct grants', async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM pg_roles WHERE rolname = 'cerniq_app'`
    );
    expect(result.length).toBe(1);
  });
});
```

---

### T005: PostgreSQL Secret Management

**Scop:** Verifică secretele Docker.

```bash
#!/bin/bash
# tests/infra/f02-pg-secrets.test.sh

describe "PostgreSQL Secrets" {
  
  SECRET_FILE="/var/www/CerniqAPP/secrets/postgres_password"
  
  it "should have postgres_password file" {
    [[ -f "$SECRET_FILE" ]]
    assert_success
  }
  
  it "should have strict permissions (600)" {
    perms=$(stat -c %a "$SECRET_FILE")
    [[ "$perms" == "600" ]]
    assert_success
  }
  
  it "should have password of sufficient length (32+ chars)" {
    length=$(wc -c < "$SECRET_FILE")
    [[ $length -ge 32 ]]
    assert_success
  }
  
  it "should NOT be tracked in git" {
    ! git ls-files --error-unmatch "$SECRET_FILE" 2>/dev/null
    assert_success
  }
}
```

---

### T006: PostgreSQL Connectivity

**Scop:** Verifică conectivitatea în rețeaua internă.

```typescript
// tests/integration/database/postgresql-connectivity.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { Pool } from 'pg';

describe('PostgreSQL Connectivity', () => {
  let pool: Pool;
  
  beforeAll(() => {
    pool = new Pool({
      host: 'localhost', // Via Docker network
      database: 'cerniq_production',
      user: 'cerniq',
      password: process.env.POSTGRES_PASSWORD,
    });
  });
  
  it('should accept connections from internal network', async () => {
    const client = await pool.connect();
    const result = await client.query('SELECT 1 as test');
    expect(result.rows[0].test).toBe(1);
    client.release();
  });
  
  it('should reject connections with invalid password', async () => {
    const badPool = new Pool({
      host: 'localhost',
      database: 'cerniq_production',
      user: 'cerniq',
      password: 'wrong_password',
    });
    
    await expect(badPool.connect()).rejects.toThrow();
  });
  
  it('should handle connection pooling', async () => {
    const connections = await Promise.all(
      Array.from({ length: 10 }, () => pool.connect())
    );
    
    expect(connections).toHaveLength(10);
    
    connections.forEach(c => c.release());
  });
});
```

---

## PERFORMANCE BENCHMARKS

```typescript
// tests/integration/database/postgresql-performance.test.ts
import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '@cerniq/db';

describe('PostgreSQL Performance', () => {
  
  it('should execute simple query under 5ms', async () => {
    const start = performance.now();
    await db.execute(sql`SELECT 1`);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(5);
  });
  
  it('should execute EXPLAIN ANALYZE on complex query', async () => {
    const result = await db.execute(sql`
      EXPLAIN (ANALYZE, FORMAT JSON) 
      SELECT * FROM pg_catalog.pg_tables LIMIT 10
    `);
    
    const plan = result[0]['QUERY PLAN'][0];
    expect(plan['Execution Time']).toBeLessThan(100); // < 100ms
  });
  
  it('should support parallel query execution', async () => {
    const result = await db.execute(sql`SHOW max_parallel_workers`);
    expect(parseInt(result[0].max_parallel_workers)).toBeGreaterThanOrEqual(8);
  });
});
```

---

## CHECKLIST VALIDARE

### Container

- [ ] Image: postgis/postgis:18-3.6
- [ ] Health status: healthy
- [ ] Nu expune port 64032 public
- [ ] Conectat la cerniq_data network
- [ ] Memory limit >= 32GB

### Configuration

- [ ] shared_buffers = 32GB
- [ ] effective_cache_size = 96GB
- [ ] io_method = io_uring
- [ ] max_parallel_workers_per_gather = 8
- [ ] password_encryption = scram-sha-256

### Extensions

- [ ] pgvector instalat și funcțional
- [ ] PostGIS instalat și funcțional
- [ ] pg_trgm instalat și funcțional
- [ ] uuid-ossp instalat

### Schemas

- [ ] bronze, silver, gold, approval, audit create
- [ ] Role cerniq_app cu grants corecte

### Security

- [ ] Secret file permisiuni 600
- [ ] Nu tracked în git
- [ ] Parolă >= 32 caractere

---

**Document generat:** 20 Ianuarie 2026  
**Conformitate:** Master Spec v1.2
