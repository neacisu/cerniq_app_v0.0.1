# CERNIQ.APP — ETAPA 4: WORKERS CATEGORIA J
## Audit & Compliance Workers (3 Workers)
### Versiunea 1.0 | 19 Ianuarie 2026

---

## Worker #45: audit:log:write
```typescript
export async function auditLogWriteProcessor(
  job: Job<AuditLogInput>
): Promise<{logId: string}> {
  const {
    eventType, entityType, entityId, actorType, actorId,
    action, oldValues, newValues, metadata, correlationId, tenantId
  } = job.data;
  
  // Compute hash chain
  const lastLog = await db.query.goldAuditLogsEtapa4.findFirst({
    orderBy: [desc(goldAuditLogsEtapa4.createdAt)],
    columns: { id: true, eventType: true, entityId: true, createdAt: true }
  });
  
  const prevHash = lastLog 
    ? crypto.createHash('sha256')
        .update(`${lastLog.id}${lastLog.eventType}${lastLog.entityId}${lastLog.createdAt}`)
        .digest('hex')
    : null;
  
  // Insert log
  const [log] = await db.insert(goldAuditLogsEtapa4).values({
    tenantId,
    prevHash,
    eventType,
    entityType,
    entityId,
    actorType,
    actorId,
    action,
    oldValues: oldValues || {},
    newValues: newValues || {},
    metadata: metadata || {},
    correlationId,
    success: true
  }).returning();
  
  // Send to SigNoz
  tracer.startSpan(`audit.${eventType}`, {
    attributes: {
      'audit.entity_type': entityType,
      'audit.entity_id': entityId,
      'audit.action': action,
      'audit.correlation_id': correlationId
    }
  }).end();
  
  return { logId: log.id };
}

// Helper function used by all workers
export async function logAudit(
  eventType: string,
  entityType: string,
  entityId: string,
  correlationId: string,
  details: Record<string, any> = {},
  tenantId?: string
): Promise<void> {
  await flowProducer.add({
    queueName: 'audit:log:write',
    name: `audit-${Date.now()}`,
    data: {
      eventType,
      entityType,
      entityId,
      actorType: 'SYSTEM',
      actorId: 'worker',
      action: eventType.toLowerCase(),
      newValues: details,
      correlationId,
      tenantId
    }
  });
}
```

## Worker #46: audit:compliance:check (Cron 06:00)
```typescript
export async function auditComplianceCheckProcessor(
  job: Job<{correlationId: string}>
): Promise<ComplianceReport> {
  const { correlationId } = job.data;
  const issues: ComplianceIssue[] = [];
  
  // 1. Check GDPR - Data retention
  const oldData = await db.query.goldAuditLogsEtapa4.findMany({
    where: lt(goldAuditLogsEtapa4.createdAt, new Date(Date.now() - 7 * 365 * 24 * 60 * 60 * 1000))
  });
  if (oldData.length > 0) {
    issues.push({ type: 'GDPR', severity: 'HIGH', message: `${oldData.length} records exceed 7-year retention` });
  }
  
  // 2. Check e-Factura compliance
  const pendingInvoices = await db.query.goldInvoices.findMany({
    where: and(
      isNull(goldInvoices.efacturaId),
      lt(goldInvoices.createdAt, new Date(Date.now() - 5 * 24 * 60 * 60 * 1000))
    )
  });
  if (pendingInvoices.length > 0) {
    issues.push({ 
      type: 'E_FACTURA', 
      severity: 'CRITICAL', 
      message: `${pendingInvoices.length} invoices not sent to SPV within 5 days` 
    });
  }
  
  // 3. Check credit profiles without score
  const unscoredClients = await db.query.goldCreditProfiles.findMany({
    where: or(
      isNull(goldCreditProfiles.creditScore),
      lt(goldCreditProfiles.lastScoredAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
    )
  });
  if (unscoredClients.length > 0) {
    issues.push({ 
      type: 'CREDIT', 
      severity: 'MEDIUM', 
      message: `${unscoredClients.length} clients with expired or missing credit scores` 
    });
  }
  
  // 4. Check unsigned contracts
  const unsignedContracts = await db.query.goldContracts.findMany({
    where: and(
      eq(goldContracts.status, 'SENT_FOR_SIGNATURE'),
      lt(goldContracts.sentAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    )
  });
  if (unsignedContracts.length > 0) {
    issues.push({ 
      type: 'CONTRACT', 
      severity: 'MEDIUM', 
      message: `${unsignedContracts.length} contracts pending signature > 7 days` 
    });
  }
  
  // Generate report
  const report: ComplianceReport = {
    generatedAt: new Date(),
    issuesFound: issues.length,
    criticalIssues: issues.filter(i => i.severity === 'CRITICAL').length,
    issues
  };
  
  // Store report
  await db.insert(complianceReports).values({
    reportDate: new Date(),
    reportData: report,
    issueCount: issues.length
  });
  
  // Alert if critical issues
  if (report.criticalIssues > 0) {
    await slackClient.sendMessage({
      channel: '#compliance-alerts',
      text: `🚨 Critical Compliance Issues Found: ${report.criticalIssues}`
    });
  }
  
  return report;
}
```

## Worker #47: audit:data:anonymize (Cron Sunday 02:00)
```typescript
export async function auditDataAnonymizeProcessor(
  job: Job<{correlationId: string}>
): Promise<{anonymizedCount: number}> {
  const { correlationId } = job.data;
  const sevenYearsAgo = new Date(Date.now() - 7 * 365 * 24 * 60 * 60 * 1000);
  let anonymizedCount = 0;
  
  // Anonymize old audit logs (keep structure, remove PII)
  const oldLogs = await db.update(goldAuditLogsEtapa4)
    .set({
      metadata: sql`jsonb_set(metadata, '{anonymized}', 'true')`,
      oldValues: sql`'{}'::jsonb`,
      newValues: sql`'{}'::jsonb`
    })
    .where(and(
      lt(goldAuditLogsEtapa4.createdAt, sevenYearsAgo),
      sql`NOT (metadata ? 'anonymized')`
    ))
    .returning();
  anonymizedCount += oldLogs.length;
  
  // Delete very old partitions (if exists)
  const tenYearsAgo = new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000);
  const year = tenYearsAgo.getFullYear();
  const month = String(tenYearsAgo.getMonth() + 1).padStart(2, '0');
  
  try {
    await db.execute(sql.raw(`DROP TABLE IF EXISTS gold_audit_logs_etapa4_${year}_${month}`));
  } catch (e) {
    // Partition may not exist
  }
  
  await logAudit('DATA_ANONYMIZED', 'system', 'etapa4', correlationId, { anonymizedCount });
  
  return { anonymizedCount };
}
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
