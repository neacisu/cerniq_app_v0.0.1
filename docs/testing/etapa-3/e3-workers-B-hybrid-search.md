# CERNIQ.APP — TESTE E3: HYBRID SEARCH (RAG)

## Teste pentru vector + BM25 hybrid search

**Categorie:** B | **Workeri:** 6

---

## TESTE

```typescript
describe('Hybrid Search', () => {
  beforeAll(async () => {
    await seedProducts(100);
  });
  
  it('should combine vector and keyword scores', async () => {
    const results = await hybridSearch.search('semințe porumb pioneer', {
      vectorWeight: 0.7,
      bm25Weight: 0.3,
    });
    expect(results[0].combinedScore).toBeDefined();
  });
  
  it('should return relevant results first', async () => {
    const results = await hybridSearch.search('tratament fungic pentru grâu');
    expect(results[0].category).toBe('tratamente');
  });
  
  it('should handle no results', async () => {
    const results = await hybridSearch.search('xyz123nonexistent');
    expect(results).toHaveLength(0);
  });
});

describe('Reranking', () => {
  it('should rerank with cross-encoder', async () => {
    const initial = await hybridSearch.search('porumb', { limit: 20 });
    const reranked = await reranker.rerank(initial, 'porumb pentru siloz');
    expect(reranked[0].id).not.toBe(initial[0].id);
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
