# CERNIQ.APP — TESTE E2: EMAIL (RESEND & INSTANTLY)

## Teste pentru email delivery și warmup

**Categorii:** D-E | **Workeri:** 14

---

## TESTE RESEND

```typescript
describe('Resend Integration', () => {
  it('should send email', async () => {
    server.use(http.post('https://api.resend.com/*', () => 
      HttpResponse.json({ id: 'email-123' })
    ));
    const result = await resendService.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });
    expect(result.id).toBe('email-123');
  });
  
  it('should track delivery status', async () => {
    const email = await sendEmail();
    await resendService.processWebhook({ type: 'delivered', emailId: email.id });
    expect(await getEmailStatus(email.id)).toBe('delivered');
  });
  
  it('should handle bounces', async () => {
    const email = await sendEmail();
    await resendService.processWebhook({ type: 'bounced', emailId: email.id });
    expect(await getEmailStatus(email.id)).toBe('bounced');
  });
});
```

## TESTE INSTANTLY

```typescript
describe('Instantly Warmup', () => {
  it('should add domain to warmup', async () => {
    server.use(http.post('https://api.instantly.ai/*', () => HttpResponse.json({ success: true })));
    const result = await instantlyService.addDomainToWarmup('company.com');
    expect(result.success).toBe(true);
  });
  
  it('should check deliverability score', async () => {
    server.use(http.get('https://api.instantly.ai/*', () => 
      HttpResponse.json({ score: 85 })
    ));
    const score = await instantlyService.getDeliverabilityScore('company.com');
    expect(score).toBe(85);
  });
});
```

## TESTE UNSUBSCRIBE

```typescript
describe('Unsubscribe', () => {
  it('should process unsubscribe link', async () => {
    await unsubscribeService.process('lead-123', 'email');
    const lead = await getLead('lead-123');
    expect(lead.emailOptOut).toBe(true);
  });
  
  it('should stop active sequences', async () => {
    const seq = await createActiveSequence('lead-123');
    await unsubscribeService.process('lead-123', 'email');
    expect(await getSequence(seq.id).status).toBe('stopped');
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
