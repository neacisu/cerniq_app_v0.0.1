# CERNIQ.APP — TESTE F0.12: DEV ENVIRONMENT

## Teste pentru ESLint, TypeScript și dev tooling

**Fază:** F0.12 | **Taskuri:** 5

---

## TESTE

```typescript
describe('Development Environment', () => {
  it('should pass ESLint', async () => {
    const { exitCode } = await exec('pnpm lint');
    expect(exitCode).toBe(0);
  });
  
  it('should have TypeScript strict mode', async () => {
    const tsconfig = await readJson('tsconfig.json');
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });
  
  it('should have Biome configured', async () => {
    const { exitCode } = await exec('pnpm biome check .');
    expect(exitCode).toBe(0);
  });
  
  it('should have pre-commit hooks', async () => {
    const huskyConfig = await readFile('.husky/pre-commit');
    expect(huskyConfig).toContain('lint-staged');
  });
  
  it('should start dev server', async () => {
    const server = exec('pnpm dev');
    await sleep(5000);
    const response = await fetch('http://localhost:5173');
    expect(response.status).toBe(200);
    server.kill();
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
