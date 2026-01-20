# CERNIQ.APP — ETAPA 2: INDEX TESTE COLD OUTREACH

## Documentație testare pentru 52 workeri de outreach

**Versiunea:** 1.0 | **Data:** 20 Ianuarie 2026  
**Referință:** [etapa2-plan-implementare.md](file:///var/www/CerniqAPP/docs/specifications/Etapa%202/etapa2-plan-implementare.md)

---

## SUMAR

| Fază | Denumire | Workeri | Document Teste |
| ---- | -------- | ------- | -------------- |
| F2.A | Quota Guardian | 6 | [e2-workers-A-quota-guardian.md](./e2-workers-A-quota-guardian.md) |
| F2.B | Orchestration | 8 | [e2-workers-B-orchestration.md](./e2-workers-B-orchestration.md) |
| F2.C | WhatsApp | 10 | [e2-workers-C-whatsapp.md](./e2-workers-C-whatsapp.md) |
| F2.D | Email Resend | 8 | [e2-workers-DE-email.md](./e2-workers-DE-email.md) |
| F2.E | Email Instantly | 6 | [e2-workers-DE-email.md](./e2-workers-DE-email.md) |
| F2.F-L | Remaining | 14 | [e2-workers-FL-remaining.md](./e2-workers-FL-remaining.md) |
| API | Endpoints | — | [e2-api-endpoints.md](./e2-api-endpoints.md) |
| HITL | Approvals | — | [e2-hitl-system.md](./e2-hitl-system.md) |
| **TOTAL** | | **52** | **8 documente** |

---

## WORKER CATEGORIES

### A: Quota Guardian (6 workeri)

| Worker | Queue | Funcție |
| ------ | ----- | ------- |
| Q.1 | `outreach:quota:init` | Initialize daily quotas |
| Q.2 | `outreach:quota:check` | Check before send |
| Q.3 | `outreach:quota:consume` | Decrement quota |
| Q.4 | `outreach:quota:reset` | Daily reset cron |
| Q.5 | `outreach:quota:aggregate` | Multi-channel totals |
| Q.6 | `outreach:quota:alert` | Limit warnings |

### B: Orchestration (8 workeri)

| Worker | Queue | Funcție |
| ------ | ----- | ------- |
| O.1 | `outreach:sequence:start` | Start sequence |
| O.2 | `outreach:sequence:step` | Process step |
| O.3 | `outreach:sequence:delay` | Handle delays |
| O.4 | `outreach:sequence:branch` | A/B branching |
| O.5 | `outreach:sequence:stop` | Stop sequence |
| O.6 | `outreach:sequence:pause` | Pause/resume |
| O.7 | `outreach:sequence:schedule` | Scheduled sends |
| O.8 | `outreach:sequence:analytics` | Track metrics |

### C: WhatsApp (10 workeri)

| Worker | Queue | Funcție |
| ------ | ----- | ------- |
| W.1-W.2 | `outreach:whatsapp:send` | Message send |
| W.3-W.4 | `outreach:whatsapp:receive` | Receive webhook |
| W.5-W.6 | `outreach:whatsapp:rotate` | Phone rotation |
| W.7-W.8 | `outreach:whatsapp:warmup` | Account warmup |
| W.9-W.10 | `outreach:whatsapp:recovery` | Ban recovery |

---

## KEY TESTS

### Quota Lua Scripts

```typescript
describe('Quota Guardian Redis Scripts', () => {
  it('should atomically check and consume quota', async () => {
    await redis.set('quota:phone:123:daily', '200');
    
    const result = await redis.eval(
      CONSUME_QUOTA_LUA,
      1,
      'quota:phone:123:daily'
    );
    
    expect(result).toBe(199);
  });
  
  it('should reject when quota exhausted', async () => {
    await redis.set('quota:phone:123:daily', '0');
    
    const result = await redis.eval(
      CONSUME_QUOTA_LUA,
      1,
      'quota:phone:123:daily'
    );
    
    expect(result).toBe(-1); // Rejected
  });
});
```

### WhatsApp Phone Rotation

```typescript
describe('Phone Rotation', () => {
  it('should rotate across 20 phones', async () => {
    const usedPhones = new Set();
    
    for (let i = 0; i < 100; i++) {
      const phone = await rotationService.getNextPhone();
      usedPhones.add(phone.id);
    }
    
    expect(usedPhones.size).toBe(20);
  });
  
  it('should detect and quarantine banned phone', async () => {
    const phone = await rotationService.getNextPhone();
    
    await rotationService.reportBan(phone.id);
    
    const status = await getPhoneStatus(phone.id);
    expect(status).toBe('quarantined');
  });
});
```

---

## COVERAGE TARGETS

| Component | Min Coverage |
| --------- | ------------ |
| Quota Scripts | 95% |
| Orchestration | 90% |
| WhatsApp | 85% |
| Email | 85% |

---

**Document generat:** 20 Ianuarie 2026
