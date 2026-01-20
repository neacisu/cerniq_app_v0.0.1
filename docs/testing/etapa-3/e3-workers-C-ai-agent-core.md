# CERNIQ.APP — TESTE E3: AI AGENT CORE

## Teste pentru LLM orchestration și tool calling

**Categorie:** C | **Workeri:** 6

---

## TESTE

```typescript
describe('AI Agent', () => {
  it('should respond to greeting', async () => {
    const response = await agent.chat('Bună ziua!');
    expect(response.text).toContain('Bună');
  });
  
  it('should use tools', async () => {
    const response = await agent.chat('Cât costă porumbul Pioneer P9911?');
    expect(response.toolCalls).toContainEqual(
      expect.objectContaining({ name: 'searchProducts' })
    );
  });
  
  it('should maintain conversation context', async () => {
    await agent.chat('Vreau porumb');
    const response = await agent.chat('Ce soiuri aveți?');
    expect(response.context.previousTopic).toBe('porumb');
  });
});

describe('Tool Orchestration', () => {
  it('should chain tools', async () => {
    const response = await agent.chat('Verifică stocul pentru SKU-001 și calculează prețul pentru 50 saci');
    expect(response.toolCalls).toHaveLength(2);
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
