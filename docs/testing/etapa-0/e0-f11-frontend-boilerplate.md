# CERNIQ.APP — TESTE F0.11: FRONTEND BOILERPLATE

## Teste pentru React, Vite și TanStack

**Fază:** F0.11 | **Taskuri:** 6

---

## TESTE

```typescript
describe('Frontend Boilerplate', () => {
  it('should build without errors', async () => {
    const { exitCode } = await exec('pnpm --filter @cerniq/web build');
    expect(exitCode).toBe(0);
  });
  
  it('should pass type checking', async () => {
    const { exitCode } = await exec('pnpm --filter @cerniq/web typecheck');
    expect(exitCode).toBe(0);
  });
  
  it('should have React 19 installed', async () => {
    const pkg = await readJson('apps/web/package.json');
    expect(pkg.dependencies.react).toMatch(/^19/);
  });
  
  it('should have TanStack Query configured', async () => {
    const pkg = await readJson('apps/web/package.json');
    expect(pkg.dependencies['@tanstack/react-query']).toBeDefined();
  });
});

describe('Component Tests', () => {
  it('should render App component', () => {
    render(<App />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
