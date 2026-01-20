# CERNIQ.APP — TESTE F1.11: HITL INTEGRATION

## Teste pentru integrarea Human-in-the-Loop în Data Pipeline

**Fază:** F1.11 | **Workeri:** 2 | **Queue prefix:** `approval:*`

---

## SCENARII HITL ETAPA 1

| Scenario | Trigger | SLA | Acțiune |
| -------- | ------- | --- | ------- |
| Dedup Review | Fuzzy match score 0.7-0.9 | 60 min | Merge/Keep separate |
| Quality Review | Lead score < 20 | 120 min | Approve/Reject |
| Data Validation | Missing critical fields | 30 min | Complete/Mark invalid |

---

## TESTE INTEGRATION

```typescript
// packages/hitl/tests/integration/e1-hitl.test.ts
describe('E1 HITL Integration', () => {
  
  describe('Dedup Review Flow', () => {
    it('should create task when fuzzy match detected', async () => {
      // Insert two similar companies
      await insertSilverCompany({ cui: '12345678', denumire: 'AGRO TEST SRL' });
      await insertSilverCompany({ cui: '12345679', denumire: 'AGRO TSET SRL' });
      
      // Run dedup worker
      await dedupQueue.add('fuzzy', { tenantId: 'test' });
      await waitForQueue(dedupQueue);
      
      // Should create approval task
      const tasks = await getApprovalTasks({ type: 'dedup_review' });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].metadata.similarity).toBeGreaterThan(0.7);
    });
    
    it('should merge companies when approved', async () => {
      const task = await createDedupReviewTask({
        companyA: 'comp-a',
        companyB: 'comp-b',
      });
      
      await approvalService.decide(task.id, {
        decision: 'approved',
        reason: 'Same company',
        mergeInto: 'comp-a',
        decidedBy: 'user-123',
      });
      
      // Company B should be merged into A
      const compB = await getSilverCompany('comp-b');
      expect(compB.mergedInto).toBe('comp-a');
      expect(compB.status).toBe('merged');
    });
    
    it('should keep separate when rejected', async () => {
      const task = await createDedupReviewTask({
        companyA: 'comp-a',
        companyB: 'comp-b',
      });
      
      await approvalService.decide(task.id, {
        decision: 'rejected',
        reason: 'Different companies',
        decidedBy: 'user-123',
      });
      
      // Both should remain active
      const compA = await getSilverCompany('comp-a');
      const compB = await getSilverCompany('comp-b');
      expect(compA.status).toBe('active');
      expect(compB.status).toBe('active');
    });
  });
  
  describe('Quality Review Flow', () => {
    it('should trigger review for low quality leads', async () => {
      const company = await insertSilverCompany({
        cui: '11111111',
        leadScore: 15, // Below threshold
      });
      
      await qualityQueue.add('review', { companyId: company.id });
      await waitForQueue(qualityQueue);
      
      const tasks = await getApprovalTasks({ type: 'quality_review' });
      expect(tasks.find(t => t.entityId === company.id)).toBeDefined();
    });
  });
  
  describe('Pipeline Resume', () => {
    it('should resume pipeline after approval', async () => {
      // Start promotion job that requires approval
      const job = await promotionQueue.add('promote', {
        silverCompanyId: 'comp-123',
        requiresApproval: true,
      });
      
      // Job should pause
      await waitForJobState(job, 'paused');
      
      // Find and approve task
      const task = await findApprovalTaskForJob(job.id);
      await approvalService.decide(task.id, {
        decision: 'approved',
        reason: 'OK',
        decidedBy: 'user-123',
      });
      
      // Job should complete
      await waitForJobState(job, 'completed');
      
      // Company should be in Gold
      const goldCompany = await getGoldCompany('comp-123');
      expect(goldCompany).toBeDefined();
    });
  });
});
```

---

## CHECKLIST VALIDARE

- [ ] Dedup task created for fuzzy matches
- [ ] Merge executes on approval
- [ ] Keep separate on rejection
- [ ] Quality review for low scores
- [ ] Pipeline resumes after decision
- [ ] Audit log records decisions

---

**Document generat:** 20 Ianuarie 2026
