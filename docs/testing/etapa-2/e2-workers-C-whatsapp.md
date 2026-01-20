# CERNIQ.APP — TESTE E2: WHATSAPP

## Teste pentru TimelinesAI și phone rotation

**Categorie:** C | **Workeri:** 10

---

## TESTE

```typescript
describe('WhatsApp Send', () => {
  it('should send message via TimelinesAI', async () => {
    server.use(http.post('https://api.timelines.ai/*', () => HttpResponse.json({ id: 'msg-123' })));
    const result = await whatsappService.send('+40721123456', 'Hello');
    expect(result.messageId).toBe('msg-123');
  });
  
  it('should use phone rotation', async () => {
    const phones = new Set();
    for (let i = 0; i < 40; i++) {
      const phone = await rotationService.getNextPhone();
      phones.add(phone.id);
    }
    expect(phones.size).toBe(20);
  });
  
  it('should respect daily limit per phone', async () => {
    const phone = await rotationService.getNextPhone();
    for (let i = 0; i < 200; i++) {
      await whatsappService.send('+40721123456', 'Test', { phoneId: phone.id });
    }
    await expect(
      whatsappService.send('+40721123456', 'Test', { phoneId: phone.id })
    ).rejects.toThrow('quota');
  });
});

describe('Ban Detection', () => {
  it('should detect ban response', async () => {
    server.use(http.post('https://api.timelines.ai/*', () => 
      HttpResponse.json({ error: 'phone_banned' }, { status: 403 })
    ));
    const result = await whatsappService.send('+40721123456', 'Test');
    expect(result.banned).toBe(true);
  });
  
  it('should quarantine banned phone', async () => {
    await rotationService.reportBan('phone-5');
    const status = await getPhoneStatus('phone-5');
    expect(status).toBe('quarantined');
  });
  
  it('should create HITL task for ban recovery', async () => {
    await rotationService.reportBan('phone-5');
    const tasks = await getApprovalTasks({ type: 'ban_recovery' });
    expect(tasks.find(t => t.metadata.phoneId === 'phone-5')).toBeDefined();
  });
});

describe('Warmup', () => {
  it('should send gradually increasing messages', async () => {
    const phone = await createNewPhone();
    const day1Limit = await warmupService.getDailyLimit(phone.id, 1);
    const day7Limit = await warmupService.getDailyLimit(phone.id, 7);
    expect(day1Limit).toBe(10);
    expect(day7Limit).toBe(50);
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
