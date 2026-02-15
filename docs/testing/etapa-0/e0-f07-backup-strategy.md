# CERNIQ.APP — TESTE F0.7: BACKUP STRATEGY

## Teste pentru BorgBackup și PostgreSQL PITR

**Fază:** F0.7 | **Taskuri:** 4

---

## TESTE

```bash
describe "Backup Strategy" {
  it "should have BorgBackup initialized" {
    borg info /backup/borg-repo
  }
  
  it "should create backup successfully" {
    borg create --stats /backup/borg-repo::test-$(date +%Y%m%d) /var/www/CerniqAPP
  }
  
  it "should run pg_dump" {
    docker exec cerniq-postgres pg_dump -U c3rn1q cerniq > /tmp/test.sql
    [[ -s /tmp/test.sql ]]
  }
  
  it "should verify backup integrity" {
    borg check /backup/borg-repo
  }
}
```

```typescript
describe('Backup Verification', () => {
  it('should restore from backup', async () => {
    await exec('borg extract /backup/borg-repo::latest /tmp/restore');
    const files = await readdir('/tmp/restore');
    expect(files.length).toBeGreaterThan(0);
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
