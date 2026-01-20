# CERNIQ.APP — TESTE CROSS-CUTTING: GDPR COMPLIANCE

## Teste pentru conformitate GDPR

**Scope:** Data retention, anonymization, erasure | **Referință:** [gdpr-compliance.md](file:///var/www/CerniqAPP/docs/governance/gdpr-compliance.md)

---

## TESTE DATA RETENTION

```typescript
describe('Data Retention', () => {
  
  it('should delete inactive contacts after 36 months', async () => {
    const contact = await createContact({
      lastActivityAt: monthsAgo(37),
    });
    
    await retentionService.processExpiredRecords();
    
    const deleted = await getContact(contact.id);
    expect(deleted).toBeNull();
  });
  
  it('should keep active contacts', async () => {
    const contact = await createContact({
      lastActivityAt: monthsAgo(12),
    });
    
    await retentionService.processExpiredRecords();
    
    const exists = await getContact(contact.id);
    expect(exists).toBeDefined();
  });
  
  it('should archive audit logs after 7 years', async () => {
    const log = await createAuditLog({
      createdAt: yearsAgo(8),
    });
    
    await retentionService.archiveOldLogs();
    
    const archived = await getArchivedLog(log.id);
    expect(archived).toBeDefined();
    
    const active = await getAuditLog(log.id);
    expect(active).toBeNull();
  });
});
```

---

## TESTE ANONYMIZATION

```typescript
describe('GDPR Anonymization', () => {
  
  it('should anonymize personal data', async () => {
    const contact = await createContact({
      email: 'real.person@company.com',
      telefon: '+40721123456',
      nume: 'Ion Popescu',
    });
    
    await gdprService.anonymize(contact.id);
    
    const anonymized = await getContact(contact.id);
    expect(anonymized.email).toMatch(/^anon_[a-f0-9]+@anonymized\.local$/);
    expect(anonymized.telefon).toBeNull();
    expect(anonymized.nume).toBe('[ANONYMIZED]');
    expect(anonymized.isAnonymized).toBe(true);
  });
  
  it('should preserve non-PII fields', async () => {
    const company = await createCompany({
      cui: '12345678',
      denumire: 'Company SRL',
      leadScore: 85,
    });
    
    await gdprService.anonymizeCompanyContacts(company.id);
    
    const preserved = await getCompany(company.id);
    expect(preserved.cui).toBe('12345678');
    expect(preserved.denumire).toBe('Company SRL');
    expect(preserved.leadScore).toBe(85);
  });
});
```

---

## TESTE RIGHT TO ERASURE

```typescript
describe('Right to Erasure', () => {
  
  it('should process erasure request within 30 days', async () => {
    const request = await createErasureRequest({
      email: 'delete.me@company.com',
      requestedAt: new Date(),
    });
    
    await erasureService.processRequest(request.id);
    
    const contacts = await findContactsByEmail('delete.me@company.com');
    expect(contacts).toHaveLength(0);
    
    const updated = await getErasureRequest(request.id);
    expect(updated.status).toBe('completed');
    expect(updated.completedAt).toBeDefined();
  });
  
  it('should cascade delete to related records', async () => {
    const contact = await createContact({ email: 'cascade@test.com' });
    await createLeadJourney({ contactId: contact.id });
    await createOutreachHistory({ contactId: contact.id });
    
    await erasureService.deleteContact(contact.id);
    
    const journeys = await getJourneysByContact(contact.id);
    const outreach = await getOutreachByContact(contact.id);
    expect(journeys).toHaveLength(0);
    expect(outreach).toHaveLength(0);
  });
  
  it('should log erasure in immutable audit', async () => {
    const contact = await createContact({ email: 'audit@test.com' });
    
    await erasureService.deleteContact(contact.id);
    
    const logs = await getAuditLogs({ action: 'GDPR_ERASURE' });
    expect(logs.find(l => l.entityId === contact.id)).toBeDefined();
  });
});
```

---

## TESTE EXPORT (PORTABILITY)

```typescript
describe('Data Portability', () => {
  
  it('should export all personal data as JSON', async () => {
    const contact = await createContact({ email: 'export@test.com' });
    await createLeadJourney({ contactId: contact.id });
    
    const exportData = await gdprService.exportPersonalData(contact.id);
    
    expect(exportData.contact).toBeDefined();
    expect(exportData.leadJourney).toBeDefined();
    expect(exportData.format).toBe('JSON');
  });
});
```

---

## CHECKLIST VALIDARE

- [ ] Retention 36 months funcționează
- [ ] Audit logs archived 7 years
- [ ] Anonymization removes PII
- [ ] Anonymization preserves non-PII
- [ ] Erasure cascades correctly
- [ ] Erasure logged immutably
- [ ] Export includes all data

---

**Document generat:** 20 Ianuarie 2026
