# CERNIQ.APP — TESTE F0.6: MONOREPO PNPM

## Teste pentru PNPM workspace și Turborepo

**Fază:** F0.6 | **Taskuri:** 8

---

## TESTE

```bash
#!/bin/bash
describe "PNPM Workspace" {
  it "should have pnpm-workspace.yaml" {
    [[ -f "pnpm-workspace.yaml" ]]
  }
  
  it "should have all packages linked" {
    pnpm ls --depth 0 | grep -q "@cerniq/db"
    pnpm ls --depth 0 | grep -q "@cerniq/shared-types"
  }
  
  it "should run turborepo build" {
    pnpm turbo run build --dry-run
  }
}
```

```typescript
describe('Monorepo Structure', () => {
  it('should have correct package.json workspaces', async () => {
    const pkg = await readJson('package.json');
    expect(pkg.packageManager).toMatch(/pnpm@9/);
  });
  
  it('should resolve internal packages', async () => {
    const { db } = await import('@cerniq/db');
    expect(db).toBeDefined();
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
