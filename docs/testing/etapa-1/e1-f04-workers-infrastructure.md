# CERNIQ.APP — TESTE F1.4: WORKERS INFRASTRUCTURE

## Teste pentru BullMQ Worker Factory și connections

**Fază:** F1.4 | **Taskuri:** 8

---

## TESTE

```typescript
describe('Worker Factory', () => {
  it('should create worker with correct config', () => {
    const worker = WorkerFactory.create('test-queue', processor);
    expect(worker.opts.connection).toBeDefined();
    expect(worker.opts.concurrency).toBe(5);
  });
  
  it('should set rate limiter', () => {
    const worker = WorkerFactory.create('rate-limited', processor, {
      limiter: { max: 100, duration: 60000 }
    });
    expect(worker.opts.limiter.max).toBe(100);
  });
  
  it('should handle graceful shutdown', async () => {
    const worker = WorkerFactory.create('shutdown-test', processor);
    await worker.close();
    expect(worker.isRunning()).toBe(false);
  });
  
  it('should emit metrics', async () => {
    const metrics: any[] = [];
    worker.on('completed', (job) => metrics.push({ job: job.id, status: 'completed' }));
    
    await queue.add('test', {});
    await sleep(1000);
    
    expect(metrics.length).toBeGreaterThan(0);
  });
});

describe('Queue Connections', () => {
  it('should use shared Redis connection', () => {
    const queue1 = new Queue('q1', { connection: sharedConnection });
    const queue2 = new Queue('q2', { connection: sharedConnection });
    
    expect(queue1.opts.connection).toBe(queue2.opts.connection);
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
